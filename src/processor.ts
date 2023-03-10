import {lookupArchive} from '@subsquid/archive-registry'
import {assertNotNull, BatchHandlerContext, EvmBatchProcessor, EvmBlock} from '@subsquid/evm-processor'
import {TableRecord} from '@subsquid/gsheets-store'
import * as erc20 from './abi/erc20'
import {Multicall} from './abi/multicall'
import {db} from './db'
import {Balances} from './tables'

const CONTRACT_ADDRESS = '0xbBe326B7b85b65c32A949F2825Be024c65c9F59a' // address of contract
const MULTICALL_ADDRESS = '0x11ce4B23bD875D7F5C6a31084f55fDe1e9A87507' // address of multicall contract
const CHAIN_NODE = 'https://rpc.ankr.com/polygon'

const processor = new EvmBatchProcessor()
    .setDataSource({
        archive: lookupArchive('polygon'),
        chain: CHAIN_NODE,
    })
    .setBlockRange({
        from: 11773052,
    })
    .addLog(CONTRACT_ADDRESS, {
        filter: [[erc20.events.Transfer.topic]],
        data: {
            evmLog: {
                topics: true,
                data: true,
            },
            transaction: {
                hash: true,
            },
        },
    })

processor.run(db, async (ctx) => {
    let accountIds = new Set<string>()
    for (let {header: block, items} of ctx.blocks) {
        for (let item of items) {
            if (item.kind !== 'evmLog') continue
            if (item.evmLog.topics[0] !== erc20.events.Transfer.topic) continue
            let event = erc20.events.Transfer.decode(item.evmLog)
            let from = event.from.toLowerCase()
            let to = event.to.toLowerCase()
            ctx.store.Transfers.insert({
                blockNumber: block.height,
                timestamp: new Date(block.timestamp),
                from,
                to,
                amount: event.value.toBigInt(),
            })
            accountIds.add(to)
            accountIds.add(from)
        }
    }

    let balances = await fetchBalances(ctx, ctx.blocks[ctx.blocks.length - 1].header, [...accountIds])
    ctx.store.Balances.insertMany(balances)
})

type BalancesRecord = TableRecord<typeof Balances>

async function fetchBalances(
    ctx: BatchHandlerContext<unknown, unknown>,
    block: EvmBlock,
    accountIds: string[]
): Promise<BalancesRecord[]> {
    let multicall = new Multicall(ctx, block, MULTICALL_ADDRESS)
    let balances = await multicall.aggregate(
        erc20.functions.balanceOf,
        CONTRACT_ADDRESS,
        accountIds.map((a) => [a]),
        1000
    )

    let balancesRecords: BalancesRecord[] = []
    for (let i = 0; i < accountIds.length; i++) {
        balancesRecords.push({
            blockNumber: block.height,
            timestamp: new Date(block.timestamp),
            address: accountIds[i],
            value: balances[i].toBigInt(),
        })
    }

    return balancesRecords
}

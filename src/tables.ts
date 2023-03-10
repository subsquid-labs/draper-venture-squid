import {Column, Table, Types} from '@subsquid/gsheets-store'

export const Transfers = new Table('transfers', {
    blockNumber: Column(Types.Numeric()),
    timestamp: Column(Types.DateTime()),
    from: Column(Types.String()),
    to: Column(Types.String()),
    amount: Column(Types.Numeric()),
})

export const Balances = new Table('balances_history', {
    blockNumber: Column(Types.Numeric()),
    timestamp: Column(Types.DateTime()),
    address: Column(Types.String()),
    value: Column(Types.Numeric()),
})

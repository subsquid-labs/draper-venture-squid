import {assertNotNull} from '@subsquid/evm-processor'
import {Database} from '@subsquid/gsheets-store'
import assert from 'assert'
import {readFileSync} from 'fs'
import {GoogleAuth} from 'google-auth-library'
import {Transfers, Balances} from './tables'

let credPath = assertNotNull(process.env.CREDENTIALS_FILE, 'Credetials file path not specified')
let credentials = JSON.parse(readFileSync(credPath, 'utf-8'))
let spreadsheetId = assertNotNull(process.env.SPREADSHEET_ID, 'spreadsheet ID not specified')

let auth = new GoogleAuth({credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets']})

export let db = new Database({
    tables: {
        Transfers,
        Balances,
    },
    spreadsheetId,
    options: {
        auth,
        retry: true,
        retryConfig: {
            retryDelay: 10000,
            retry: 100,
        },
    },
})

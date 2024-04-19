import { Address, Cell, beginCell, contractAddress, fromNano, toNano } from '@ton/core';
import { hash } from '../build/RaffleContract.compiled.json';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { TonClient4 } from '@ton/ton';
import qs from 'qs';
import qrcode from 'qrcode-terminal';
import { RaffleContract, raffleContractConfigToCell } from '../wrappers/RaffleContract';
import dotenv from 'dotenv';
import { compile, sleep } from '@ton/blueprint';

const OWNER_ADDRESS: string = '0QAAeHjRVfqPfRIjkPlxcv-OAffJUfAxWSu6RFli4FUeUCRn';
dotenv.config();

async function onchainTestScript() {
    // Code and Data cells extraction
    const codeCell = await compile('RaffleContract');
    const dataCell = raffleContractConfigToCell({
        owner_address: Address.parse(OWNER_ADDRESS),
        recent_winner: Address.parse(OWNER_ADDRESS),
    });

    // Computing DEPLOYED contract address based on Code and Data Cells
    const address = contractAddress(0, {
        code: codeCell,
        data: dataCell,
    });
    console.log('Contract address : ', address.toString());

    // Client configuration
    const endpoint = await getHttpV4Endpoint({
        network: 'testnet',
    });
    const client4 = new TonClient4({ endpoint });

    let latestBlock = await client4.getLastBlock();
    let status = await client4.getAccount(latestBlock.last.seqno, address);

    if (status.account.state.type !== 'active') {
        console.log('Contract is not active');
        return;
    }

    // QR-code for deposit to participating in raffle generation
    const contract_address: string = address.toString({ testOnly: process.env.TESTNET ? true : false });

    latestBlock = await client4.getLastBlock();
    let { exitCode, result } = await client4.runMethod(latestBlock.last.seqno, address, 'get_recent_winner');

    if (exitCode !== 0) {
        console.log('Running getter method failed');
        return;
    }
    if (result[0].type !== 'slice') {
        console.log('Unknown result type (should be integer), got: ', result[0].type);
        return;
    }

    const first_winner: Address = result[0].cell.beginParse().loadAddress();

    let msg_body: Cell = beginCell().storeInt(1, 16).endCell();

    let link =
        `https://app.tonkeeper.com/transfer/` +
        contract_address +
        '?' +
        qs.stringify({
            amount: toNano('1').toString(10),
            bin: msg_body.toBoc({ idx: false }).toString('base64'),
        });

    console.log('Scan QR-code for sending deposit to RaffleContract');
    qrcode.generate(link, { small: true }, (code) => {
        console.log(code);
    });

    while (true) {
        const latestBlock = await client4.getLastBlock();
        const { exitCode, result } = await client4.runMethod(latestBlock.last.seqno, address, 'get_num_participants');

        if (exitCode !== 0) {
            console.log('Running getter method failed');
            return;
        }
        if (result[0].type !== 'int') {
            console.log('Unknown result type (should be integer), got: ', result[0].type);
            return;
        }

        const number_of_participants = Number(fromNano(result[0].value)) * 1000000000;
        console.log('Current number of participants: ', number_of_participants);

        if (number_of_participants == 5) {
            break;
        }

        await sleep(3000);
    }

    // QR-code for raffle process (by owner)
    msg_body = beginCell().storeInt(3, 16).endCell();

    link =
        `https://app.tonkeeper.com/transfer/` +
        contract_address +
        '?' +
        qs.stringify({
            amount: toNano('0.01').toString(10),
            bin: msg_body.toBoc({ idx: false }).toString('base64'),
        });

    console.log('Scan QR-code for raffle process (only for Owner)');
    qrcode.generate(link, { small: true }, (code) => {
        console.log(code);
    });

    while (true) {
        latestBlock = await client4.getLastBlock();
        let { exitCode: masgExitCode, result: MsgResult } = await client4.runMethod(
            latestBlock.last.seqno,
            address,
            'get_num_participants',
        );

        if (masgExitCode !== 0) {
            console.log('Running getter method failed');
            return;
        }
        if (MsgResult[0].type !== 'int') {
            console.log('Unknown result type (should be integer), got: ', MsgResult[0].type);
            return;
        }

        const number_of_participants = Number(fromNano(MsgResult[0].value)) * 1000000000;

        if (number_of_participants == 0) {
            break;
        }

        await sleep(3000);

    }
    // Find new winner
    latestBlock = await client4.getLastBlock();
    let { exitCode: masgExitCode, result: MsgResult } = await client4.runMethod(
        latestBlock.last.seqno,
        address,
        'get_recent_winner',
    );

    if (masgExitCode !== 0) {
        console.log('Running getter method failed');
        return;
    }
    if (MsgResult[0].type !== 'slice') {
        console.log('Unknown result type (should be slice), got: ', MsgResult[0].type);
        return;
    }

    const new_winner: Address = MsgResult[0].cell.beginParse().loadAddress();

    if (first_winner.toString() === new_winner.toString()) {
        console.log('Raffle process failed\nWinner has remain the same. Check code and RUN TEST again!!!');
        return;
    }

    console.log('\n__________________________________________________________');
    console.log('Raffle process successfully completed\nNew winner is: ', new_winner.toString());
    console.log('__________________________________________________________\n');

    // QR-code for withdrawal funds
    msg_body = beginCell().storeInt(2, 16).endCell();

    link =
        `https://app.tonkeeper.com/transfer/` +
        contract_address +
        '?' +
        qs.stringify({
            amount: toNano('0.01').toString(10),
            bin: msg_body.toBoc({ idx: false }).toString('base64'),
        });

    console.log('Scan QR-code to withdraw funds (only for Owner)');
    qrcode.generate(link, { small: true }, (code) => {
        console.log(code);
    });
}

onchainTestScript();

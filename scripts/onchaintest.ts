import { Address, Cell, beginCell, contractAddress, fromNano, toNano } from '@ton/core';
import { hash } from '../build/RaffleContract.compiled.json';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { TonClient4 } from '@ton/ton';
import qs from 'qs';
import qrcode from 'qrcode-terminal';
import { RaffleContract, raffleContractConfigToCell } from '../wrappers/RaffleContract';
import dotenv from 'dotenv';
import { compile } from '@ton/blueprint';

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

    const latestBlock = await client4.getLastBlock();
    let status = await client4.getAccount(latestBlock.last.seqno, address);

    if (status.account.state.type !== 'active') {
        console.log('Contract is not active');
        return;
    }

    // QR-code for deposit to participating in raffle generation
    const contract_address: string = address.toString({ testOnly: process.env.TESTNET ? true : false });
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

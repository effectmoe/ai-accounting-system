/**
 * OFXパーサーのテストスクリプト
 * Usage: npx tsx scripts/test-ofx-parser.ts
 */

import { parseOFX, extractOFXDeposits, detectFileType } from '../lib/bank-ofx-parser';

// テスト用OFXデータ
const sampleOFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:UTF-8
CHARSET:CSUNICODE
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20241115120000
<LANGUAGE>JPN
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>JPY
<BANKACCTFROM>
<BANKID>0038
<ACCTID>1234567890
<ACCTTYPE>SAVINGS
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20241101
<DTEND>20241115
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20241105120000[+9:JST]
<TRNAMT>150000
<FITID>20241105001
<NAME>振込＊カブシキカイシヤ テスト
<MEMO>振込手数料無料
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20241108093000
<TRNAMT>-50000
<FITID>20241108001
<NAME>ATM出金
<MEMO>コンビニATM
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEP
<DTPOSTED>20241110140000
<TRNAMT>280000
<FITID>20241110001
<NAME>振込＊アベ タロウ
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>380000
<DTASOF>20241115120000
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

// CSVサンプル
const sampleCSV = `日付,内容,出金,入金,残高,メモ
2024/11/05,振込 テスト株式会社,,150000,200000,
2024/11/08,ATM出金,50000,,150000,`;

console.log('=== OFX Parser Test ===\n');

// 1. File type detection
console.log('1. File Type Detection:');
console.log('  OFX file:', detectFileType(sampleOFX));
console.log('  CSV file:', detectFileType(sampleCSV));
console.log('  Unknown:', detectFileType('random text'));
console.log('');

// 2. OFX Parsing
console.log('2. OFX Parsing:');
const result = parseOFX(sampleOFX);
console.log('  Success:', result.success);
console.log('  Total transactions:', result.totalCount);
console.log('  Deposits:', result.depositCount);
console.log('  Withdrawals:', result.withdrawalCount);
console.log('  Total deposit amount:', result.totalDepositAmount);
console.log('  Total withdrawal amount:', result.totalWithdrawalAmount);
console.log('');

// 3. Account info
console.log('3. Account Info:');
console.log('  Bank ID:', result.accountInfo?.BANKID);
console.log('  Account ID:', result.accountInfo?.ACCTID);
console.log('  Account Type:', result.accountInfo?.ACCTTYPE);
console.log('');

// 4. Transaction details
console.log('4. Transaction Details:');
result.transactions.forEach((t, i) => {
  console.log(`  [${i + 1}] ${t.date.toISOString().split('T')[0]} | ${t.type} | ¥${t.amount.toLocaleString()} | ${t.content}`);
  if (t.customerName) console.log(`       Customer: ${t.customerName}`);
});
console.log('');

// 5. Extract deposits only
console.log('5. Extract Deposits:');
const deposits = extractOFXDeposits(result.transactions);
console.log('  Deposit count:', deposits.length);
deposits.forEach((d, i) => {
  console.log(`  [${i + 1}] ¥${d.amount.toLocaleString()} - ${d.customerName || d.content}`);
});

console.log('\n=== Test Complete ===');

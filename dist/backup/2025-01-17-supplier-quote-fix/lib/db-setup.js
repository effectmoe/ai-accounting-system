"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.createSampleData = createSampleData;
exports.setupValidationRules = setupValidationRules;
const mongodb_client_1 = require("./mongodb-client");
const db = mongodb_client_1.DatabaseService.getInstance();
/**
 * MongoDBのコレクションとインデックスを初期化
 */
async function initializeDatabase() {
    try {
        console.log('Initializing database collections and indexes...');
        const database = await (0, mongodb_client_1.getDatabase)();
        // 1. customersコレクションのインデックス作成
        console.log('Creating indexes for customers collection...');
        await db.createIndex(mongodb_client_1.Collections.CUSTOMERS, { companyName: 1 });
        await db.createIndex(mongodb_client_1.Collections.CUSTOMERS, { email: 1 });
        await db.createIndex(mongodb_client_1.Collections.CUSTOMERS, { isActive: 1 });
        await db.createIndex(mongodb_client_1.Collections.CUSTOMERS, { 'contacts.email': 1 });
        await db.createIndex(mongodb_client_1.Collections.CUSTOMERS, { tags: 1 });
        // テキスト検索用インデックス
        await db.createIndex(mongodb_client_1.Collections.CUSTOMERS, {
            companyName: 'text',
            companyNameKana: 'text',
            'contacts.name': 'text'
        });
        // 2. companyInfoコレクションのインデックス作成
        console.log('Creating indexes for companyInfo collection...');
        await db.createIndex(mongodb_client_1.Collections.COMPANY_INFO, { isDefault: 1 });
        await db.createIndex(mongodb_client_1.Collections.COMPANY_INFO, { companyName: 1 });
        // 3. bankAccountsコレクションのインデックス作成
        console.log('Creating indexes for bankAccounts collection...');
        await db.createIndex(mongodb_client_1.Collections.BANK_ACCOUNTS, { isDefault: 1 });
        await db.createIndex(mongodb_client_1.Collections.BANK_ACCOUNTS, { isActive: 1 });
        await db.createIndex(mongodb_client_1.Collections.BANK_ACCOUNTS, { accountName: 1 });
        // 4. invoicesコレクションのインデックス作成
        console.log('Creating indexes for invoices collection...');
        await db.createIndex(mongodb_client_1.Collections.INVOICES, { invoiceNumber: 1 }, { unique: true });
        await db.createIndex(mongodb_client_1.Collections.INVOICES, { customerId: 1 });
        await db.createIndex(mongodb_client_1.Collections.INVOICES, { status: 1 });
        await db.createIndex(mongodb_client_1.Collections.INVOICES, { invoiceDate: -1 });
        await db.createIndex(mongodb_client_1.Collections.INVOICES, { dueDate: 1 });
        await db.createIndex(mongodb_client_1.Collections.INVOICES, { isGeneratedByAI: 1 });
        await db.createIndex(mongodb_client_1.Collections.INVOICES, { aiConversationId: 1 });
        // 複合インデックス
        await db.createIndex(mongodb_client_1.Collections.INVOICES, { customerId: 1, status: 1 });
        await db.createIndex(mongodb_client_1.Collections.INVOICES, { status: 1, dueDate: 1 });
        console.log('Database initialization completed successfully!');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}
/**
 * サンプルデータを作成（開発・テスト用）
 */
async function createSampleData() {
    try {
        console.log('Creating sample data...');
        // 1. 自社情報のサンプル作成
        const existingCompanyInfo = await db.findOne(mongodb_client_1.Collections.COMPANY_INFO, { isDefault: true });
        let companyInfoId;
        if (!existingCompanyInfo) {
            const companyInfo = await db.create(mongodb_client_1.Collections.COMPANY_INFO, {
                companyName: '株式会社サンプル',
                companyNameKana: 'カブシキガイシャサンプル',
                companyNameEn: 'Sample Corporation',
                registrationNumber: '1234567890123',
                invoiceRegistrationNumber: 'T1234567890123',
                postalCode: '100-0001',
                prefecture: '東京都',
                city: '千代田区',
                address1: '千代田1-1-1',
                address2: 'サンプルビル10F',
                phone: '03-1234-5678',
                fax: '03-1234-5679',
                email: 'info@sample.co.jp',
                website: 'https://sample.co.jp',
                representative: {
                    name: '山田太郎',
                    nameKana: 'ヤマダタロウ',
                    position: '代表取締役'
                },
                businessDescription: 'ITソリューションの提供',
                establishedDate: new Date('2020-01-01'),
                capital: 10000000,
                fiscalYearEnd: '03',
                isDefault: true,
                sealImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAADh0RVh0U29mdHdhcmUAbWF0cGxvdGxpYiB2ZXJzaW9uMy4xLjEsIGh0dHA6Ly9tYXRwbG90bGliLm9yZy8QZhcZAAAEV0lEQVR4nO2dW4hVVRjHf99MjqPjJWvSUiu1pIu9VERFUVlEF+hBIqILL0QPFRFFPfRQT730EkEQRRdEoouElxdBg7IICi0qvGRlZpqVo2Oa5ng55+vhrJnZZ87Z58yctfbea875/WDgzNlnr/Wtb/1nrbX3Xnt9oqoE4jNm2AYUmSDQI0GgR4JAjwSBHgkCPRIEesRJoIhcJCLrRGS9iNzmyqjRgsTtSItIG7AWOB/YBHwFXK2q33W6T3t7u44fPz7W82aTyWQAaGtr63K9l59qtVrD7ePGjetyPZvNArBz585tqjo1bg1jHexdCKxX1Q0AIvIicBlQVmA6nWbOnDkOT7V4+eWXAbjhhhu6XF+5ciUAN910U8PtH3vsMQCuueaaLtfnz58PwLJly37ub4EuvHE6sLHg701522KSySSSSbfRKfKx1QXH9sVl1LGvr8OQFZE5IrJCRFbs27fP4WnKU6vVqNVq+T+1y3an+IgzLgIXqupv/RHo4lKbgJkFf8/I5xVR1aeApwCmTJniNJQVJ3LBqnXr1gEwc+bMLtffffddAC666CLjDi3tFONytCuBWSJyhIiMAK4C3nLYXxBwOAJVNSsi84F3gDZgsap+68yyUYKLi6Kq7wPvu+yrFQgzkR4JAj3icgSWpVwfdPv27QCsXr0agEmTJjXcfvHixQBcd911Xa5XcuHnn38egGuuuYY4hCPQI0GgR5x641w8ZsyYMdr3LKSzMNQJEyY03F7u/rNmzQJgzZo1v6jqcXGfMxyBHgkCPZJIF3Y1ZlmuG9LO0BaOQI8EgR5JRAg38vV6JiYc4TkJR6BHgkCPBBf2SBDokdgCRWQm8CwwDVDgKVV9VESygCLSBmTr/UGJb9LpdG23VquZD0slz/cxE5kFblHVI4BjgZtF5EjgNmC5qs4Cluf/Dlgo18e4Y/2hR4Gq2qKqq/K/dwHf5+5zGfBMvtkzwOXGrUsQJl14N/Ao4AtgmqpuyV/aSs7FDZBMJku6ajltBw4c2FDp8LuqXrQHnQWKyATgVWCBqu4svKa5TIeSAqtVGzKZDBs2bODQoUMu1vhBr/Y6r6NJ5n7g7f50YbeAiKTIiVusqq/l8/8QkXSquk1E0sCfpe5b3hFKSN9y6S4mTqfaRaCIiAJP596uKFT1NeBGYFH++5ta35v0xukF1YTqOuXoEcKqei5wPXCuqh4NPMmhQQcXisrHxbMBJlHVcJGmQpzFNKkIa+UtAT7jLgHxnCRcoOJOJBY3eVBrv0gQGCBJoFdX7peBiPwFbAe2eb2xP6bQu92Hq2rs1x95FQiQz4/ow8ZhYtPu4MIeCQI9MiyBTw3pef3Fmt1D6QO/TQQXjokGgPD7jmFNDH8cAAD//+YNYtoelJiAAAAAAElFTkSuQmCC'
            });
            companyInfoId = companyInfo._id.toString();
            console.log('Created sample company info');
        }
        else {
            companyInfoId = existingCompanyInfo._id.toString();
            console.log('Using existing company info');
        }
        // 2. 銀行口座のサンプル作成
        const existingBankAccount = await db.findOne(mongodb_client_1.Collections.BANK_ACCOUNTS, { isDefault: true });
        let bankAccountId;
        if (!existingBankAccount) {
            const bankAccount = await db.create(mongodb_client_1.Collections.BANK_ACCOUNTS, {
                accountName: 'メイン口座',
                bankName: 'みずほ銀行',
                bankNameKana: 'ミズホギンコウ',
                bankCode: '0001',
                branchName: '東京営業部',
                branchNameKana: 'トウキョウエイギョウブ',
                branchCode: '001',
                accountType: collections_1.AccountType.CHECKING,
                accountNumber: '1234567',
                accountHolder: '株式会社サンプル',
                accountHolderKana: 'カブシキガイシャサンプル',
                isDefault: true,
                isActive: true,
                notes: 'メインの取引口座'
            });
            bankAccountId = bankAccount._id.toString();
            console.log('Created sample bank account');
        }
        else {
            bankAccountId = existingBankAccount._id.toString();
            console.log('Using existing bank account');
        }
        // 3. 顧客のサンプル作成
        const sampleCustomer = await db.create(mongodb_client_1.Collections.CUSTOMERS, {
            companyName: '株式会社テストクライアント',
            companyNameKana: 'カブシキガイシャテストクライアント',
            registrationNumber: '9876543210987',
            invoiceRegistrationNumber: 'T9876543210987',
            postalCode: '150-0001',
            prefecture: '東京都',
            city: '渋谷区',
            address1: '渋谷1-1-1',
            address2: 'テストビル5F',
            phone: '03-9876-5432',
            fax: '03-9876-5433',
            email: 'info@testclient.co.jp',
            website: 'https://testclient.co.jp',
            contacts: [
                {
                    name: '佐藤花子',
                    nameKana: 'サトウハナコ',
                    department: '経理部',
                    position: '部長',
                    email: 'sato@testclient.co.jp',
                    phone: '03-9876-5432',
                    mobile: '090-1234-5678',
                    isPrimary: true
                }
            ],
            paymentTerms: {
                paymentMethod: collections_1.PaymentMethod.BANK_TRANSFER,
                paymentDueDays: 30,
                closingDay: 31,
                paymentDay: 10,
                bankAccountId: bankAccountId
            },
            notes: 'テスト用の顧客データ',
            isActive: true,
            tags: ['重要顧客', 'IT業界']
        });
        console.log('Created sample customer');
        // 4. 請求書のサンプル作成
        const invoiceDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const sampleInvoice = await db.create(mongodb_client_1.Collections.INVOICES, {
            invoiceNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-0001`,
            invoiceDate: invoiceDate,
            dueDate: dueDate,
            customerId: sampleCustomer._id.toString(),
            customerSnapshot: {
                companyName: sampleCustomer.companyName,
                postalCode: sampleCustomer.postalCode,
                address: `${sampleCustomer.prefecture}${sampleCustomer.city}${sampleCustomer.address1}${sampleCustomer.address2 || ''}`,
                phone: sampleCustomer.phone,
                email: sampleCustomer.email,
                contactName: sampleCustomer.contacts[0].name
            },
            items: [
                {
                    itemName: 'Webシステム開発',
                    description: '受発注管理システムの開発',
                    quantity: 1,
                    unit: '式',
                    unitPrice: 1000000,
                    amount: 1000000,
                    taxRate: 0.10,
                    taxAmount: 100000,
                    totalAmount: 1100000,
                    sortOrder: 1
                },
                {
                    itemName: '月額サポート費用',
                    description: '2024年1月分',
                    quantity: 1,
                    unit: '月',
                    unitPrice: 50000,
                    amount: 50000,
                    taxRate: 0.10,
                    taxAmount: 5000,
                    totalAmount: 55000,
                    sortOrder: 2
                }
            ],
            subtotal: 1050000,
            taxAmount: 105000,
            totalAmount: 1155000,
            paymentMethod: collections_1.PaymentMethod.BANK_TRANSFER,
            bankAccountId: bankAccountId,
            status: collections_1.InvoiceStatus.SENT,
            paidAmount: 0,
            isGeneratedByAI: false,
            notes: '請求書の備考欄です',
            companyInfoId: companyInfoId,
            companySnapshot: {
                companyName: '株式会社サンプル',
                invoiceRegistrationNumber: 'T1234567890123',
                postalCode: '100-0001',
                address: '東京都千代田区千代田1-1-1 サンプルビル10F',
                phone: '03-1234-5678',
                email: 'info@sample.co.jp',
                sealImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAADh0RVh0U29mdHdhcmUAbWF0cGxvdGxpYiB2ZXJzaW9uMy4xLjEsIGh0dHA6Ly9tYXRwbG90bGliLm9yZy8QZhcZAAAEV0lEQVR4nO2dW4hVVRjHf99MjqPjJWvSUiu1pIu9VERFUVlEF+hBIqILL0QPFRFFPfRQT730EkEQRRdEoouElxdBg7IICi0qvGRlZpqVo2Oa5ng55+vhrJnZZ87Z58yctfbea875/WDgzNlnr/Wtb/1nrbX3Xnt9oqoE4jNm2AYUmSDQI0GgR4JAjwSBHgkCPRIEesRJoIhcJCLrRGS9iNzmyqjRgsTtSItIG7AWOB/YBHwFXK2q33W6T3t7u44fPz7W82aTyWQAaGtr63K9l59qtVrD7ePGjetyPZvNArBz585tqjo1bg1jHexdCKxX1Q0AIvIicBlQVmA6nWbOnDkOT7V4+eWXAbjhhhu6XF+5ciUAN910U8PtH3vsMQCuueaaLtfnz58PwLJly37ub4EuvHE6sLHg701522KSySSSSbfRKfKx1QXH9sVl1LGvr8OQFZE5IrJCRFbs27fP4WnKU6vVqNVq+T+1y3an+IgzLgIXqupv/RHo4lKbgJkFf8/I5xVR1aeApwCmTJniNJQVJ3LBqnXr1gEwc+bMLtffffddAC666CLjDi3tFONytCuBWSJyhIiMAK4C3nLYXxBwOAJVNSsi84F3gDZgsap+68yyUYKLi6Kq7wPvu+yrFQgzkR4JAj3icgSWpVwfdPv27QCsXr0agEmTJjXcfvHixQBcd911Xa5XcuHnn38egGuuuYY4hCPQI0GgR5x641w8ZsyYMdr3LKSzMNQJEyY03F7u/rNmzQJgzZo1v6jqcXGfMxyBHgkCPZJIF3Y1ZlmuG9LO0BaOQI8EgR5JRAg38vV6JiYc4TkJR6BHgkCPBBf2SBDokdgCRWQm8CwwDVDgKVV9VESygCLSBmTr/UGJb9LpdG23VquZD0slz/cxE5kFblHVI4BjgZtF5EjgNmC5qs4Cluf/Dlgo18e4Y/2hR4Gq2qKqq/K/dwHf5+5zGfBMvtkzwOXGrUsQJl14N/Ao4AtgmqpuyV/aSs7FDZBMJku6ajltBw4c2FDp8LuqXrQHnQWKyATgVWCBqu4svKa5TIeSAqtVGzKZDBs2bODQoUMu1vhBr/Y6r6NJ5n7g7f50YbeAiKTIiVusqq/l8/8QkXSquk1E0sCfpe5b3hFKSN9y6S4mTqfaRaCIiAJP596uKFT1NeBGYFH++5ta35v0xukF1YTqOuXoEcKqei5wPXCuqh4NPMmhQQcXisrHxbMBJlHVcJGmQpzFNKkIa+UtAT7jLgHxnCRcoOJOJBY3eVBrv0gQGCBJoFdX7peBiPwFbAe2eb2xP6bQu92Hq2rs1x95FQiQz4/ow8ZhYtPu4MIeCQI9MiyBTw3pef3Fmt1D6QO/TQQXjokGgPD7jmFNDH8cAAD//+YNYtoelJiAAAAAAElFTkSuQmCC',
                bankAccount: {
                    bankName: 'みずほ銀行',
                    branchName: '東京営業部',
                    accountType: '当座預金',
                    accountNumber: '1234567',
                    accountHolder: '株式会社サンプル'
                }
            }
        });
        console.log('Created sample invoice');
        console.log('Sample data creation completed!');
    }
    catch (error) {
        console.error('Error creating sample data:', error);
        throw error;
    }
}
/**
 * データベースのバリデーションルールを設定
 */
async function setupValidationRules() {
    try {
        console.log('Setting up database validation rules...');
        const database = await (0, mongodb_client_1.getDatabase)();
        // customersコレクションのバリデーション
        await database.command({
            collMod: mongodb_client_1.Collections.CUSTOMERS,
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['companyName', 'postalCode', 'prefecture', 'city', 'address1', 'phone', 'email', 'isActive'],
                    properties: {
                        companyName: {
                            bsonType: 'string',
                            description: 'Company name is required'
                        },
                        email: {
                            bsonType: 'string',
                            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                            description: 'Valid email is required'
                        },
                        phone: {
                            bsonType: 'string',
                            pattern: '^[0-9-]+$',
                            description: 'Phone number should only contain numbers and hyphens'
                        },
                        isActive: {
                            bsonType: 'bool',
                            description: 'isActive must be a boolean'
                        }
                    }
                }
            }
        });
        console.log('Validation rules setup completed!');
    }
    catch (error) {
        // バリデーションルールの設定はオプショナルなので、エラーは警告として扱う
        console.warn('Warning: Could not set up validation rules:', error);
    }
}

import axios from 'axios';
import { load } from 'cheerio';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Client } = pkg;

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function ensureTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS prices (
      id SERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      buy_price NUMERIC(18,8) NOT NULL,
      sell_price NUMERIC(18,8) NOT NULL,
      currency TEXT NOT NULL
    );
  `);
}

const fetchUSD = async () => {
  const response = await axios.get(process.env.PRICE_API_URL || '');
  const $ = load(response.data);

  const usd = $("td:contains('USD')").nextAll('.currency-value').text().trim().split('₺').slice(1);

  const usdBuyPrice = usd[0];
  const usdSellPrice = usd[1];

  return {
    buy: usdBuyPrice,
    sell: usdSellPrice,
    currency: 'USD',
  };
};

async function savePricesToDb({
  buy,
  sell,
  currency,
}: {
  buy: string;
  sell: string;
  currency: string;
}) {
  return client.query(
    `INSERT INTO prices (buy_price, sell_price, currency)
     VALUES ($1, $2, $3)`,
    [buy, sell, currency]
  );
}

const main = async () => {
  try {
    await client.connect();
    console.log('Connected to db');
    await ensureTable();
    console.log('table is ensured');

    const prices = await fetchUSD();
    console.log(`Prices have been fetched ${prices}`);
    const res = await savePricesToDb(prices);
    console.log(`Prices have been saved to db ${res.rows}`);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
};

main();

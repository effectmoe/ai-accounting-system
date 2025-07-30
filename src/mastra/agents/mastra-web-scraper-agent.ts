import { Agent } from "@mastra/core";

export const mastraWebScraperAgent = new Agent({
  name: "Web Scraper Agent",
  description: "ウェブサイトから企業情報を抽出するエージェント",
  model: {
    name: "DEEPSEEK",
    provider: "DEEPSEEK"
  },
  instructions: "ウェブサイトのHTMLから企業情報を正確に抽出し、構造化されたデータとして返します。住所の分割ルールに従い、都道府県、市区町村、番地を適切に分割してください。",
  metadata: {
    capabilities: ["web_scraping", "information_extraction", "address_parsing"]
  }
});
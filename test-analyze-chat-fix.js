/**
 * Test script to verify the analyze-chat endpoint fix
 * This script tests the endpoint without needing a valid OpenAI API key
 */

const testAnalyzeChatEndpoint = async () => {
  const testCases = [
    {
      name: "Basic invoice creation",
      data: {
        conversation: "山田商事さんに、ウェブサイト制作費として50万円の請求書を作成してください",
        mode: "create"
      }
    },
    {
      name: "Monthly fee with period",
      data: {
        conversation: "田中株式会社に月額保守料3万円、今回は6ヶ月分でお願いします",
        mode: "create"
      }
    },
    {
      name: "Empty conversation (should fail)",
      data: {
        conversation: "",
        mode: "create"
      }
    }
  ];

  console.log("Testing /api/invoices/analyze-chat endpoint...\n");

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    
    try {
      const response = await fetch("http://localhost:3000/api/invoices/analyze-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(testCase.data)
      });

      const result = await response.json();
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Success: ${result.success || false}`);
      
      if (result.success) {
        console.log(`  Customer: ${result.data?.customerName}`);
        console.log(`  Amount: ¥${result.data?.totalAmount?.toLocaleString()}`);
      } else {
        console.log(`  Error: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    
    console.log("");
  }
};

// Export for use in other scripts or tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testAnalyzeChatEndpoint };
} else {
  // Run if called directly
  testAnalyzeChatEndpoint();
}
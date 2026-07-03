import dotenv from "dotenv";

dotenv.config();

async function createInvoice() {
    try {
        const response = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
                "x-api-key": process.env.NOWPAYMENTS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                price_amount: 20,
                price_currency: "usd",
                order_id: "TEST-INV-001",
                order_description: "Koara Wallet Top-up",
                success_url: "https://getkoara.com/payment/success",
                cancel_url: "https://getkoara.com/payment/cancel"
            })
        });

        const data = await response.json();

        console.log("========== INVOICE ==========");
        console.log(data);
        console.log("=============================");

    } catch (err) {
        console.error(err);
    }
}

createInvoice();
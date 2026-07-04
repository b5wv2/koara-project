import sys
import json
import re

def parse_pdf(file_path):
    try:
        import pdfplumber
    except ImportError:
        return {"success": False, "error": "pdfplumber is not installed."}

    try:
        full_text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"

        transactions = []
        # Keep track of IDs we've already processed to avoid duplicates from overlapping blocks
        seen_ids = set()
        
        # Tolerate changes in line order by extracting a block of text around potential transaction IDs (6+ digits)
        for id_match in re.finditer(r'\b(\d{6,15})\b', full_text):
            tx_id = id_match.group(1)
            
            if tx_id in seen_ids:
                continue
                
            start = max(0, id_match.start() - 200)
            end = min(len(full_text), id_match.end() + 200)
            block = full_text[start:end]
            
            # Find the first amount near this ID
            amount_match = re.search(r'([\+\-]?)\s*((?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})\b', block)
            if amount_match:
                sign = amount_match.group(1)
                if not sign:
                    if re.search(r'(?i)(withdrawal|debit|transfer out|payment to|deduction)', block):
                        sign = "-"
                    else:
                        sign = "+"
                
                amount_str = amount_match.group(2).replace(',', '')
                amount = float(amount_str)
                
                ts_match = re.search(r'\b(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})\b', block)
                timestamp = ts_match.group(1) if ts_match else ""

                transactions.append({
                    "transaction_id": tx_id,
                    "amount": amount,
                    "sign": sign,
                    "timestamp": timestamp,
                    "raw_text": block.strip().replace('\n', ' ')
                })
                seen_ids.add(tx_id)

        return {
            "success": True,
            "transactions": transactions
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No PDF path provided"}))
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    result = parse_pdf(pdf_path)
    print(json.dumps(result))

import sys
import json
import re
import fitz  # PyMuPDF

AMOUNT_REGEX = re.compile(r'^([+-])\s*(\d+(?:,\d{3})*\.\d{2})$')
TX9_REGEX = re.compile(r'^\d{9}$')
TX_GENERIC_REGEX = re.compile(r'^\d{6,15}$')

def group_lines(page):
    words = page.get_text("words")

    rows = {}

    for w in words:
        x0, y0, x1, y1, text = w[:5]
        key = round(y0)

        rows.setdefault(key, []).append((x0, text))

    lines = []

    for y in sorted(rows.keys()):
        parts = sorted(rows[y], key=lambda i: i[0])
        line = " ".join(p[1] for p in parts).strip()

        if line:
            lines.append(line)

    return lines


def parse_pdf(path):

    transactions = []

    doc = fitz.open(path)

    current = []

    for page in doc:

        lines = group_lines(page)

        for line in lines:

            if AMOUNT_REGEX.match(line):

                if current:
                    tx = parse_block(current)
                    if tx:
                        transactions.append(tx)

                current = [line]

            else:
                current.append(line)

    if current:
        tx = parse_block(current)
        if tx:
            transactions.append(tx)

    return {
        "success": True,
        "transactions": transactions
    }


def parse_block(lines):

    text = "\n".join(lines)

    amount_match = AMOUNT_REGEX.search(lines[0])

    if not amount_match:
        return None

    sign = amount_match.group(1)
    amount = float(amount_match.group(2).replace(",", ""))

    ids = []

    for line in lines:
        ids.extend(re.findall(r'\d+', line))

    tx_id = None

    for i in ids:
        if TX9_REGEX.fullmatch(i):
            tx_id = i
            break

    if tx_id is None:
        for i in ids:
            if TX_GENERIC_REGEX.fullmatch(i):
                tx_id = i
                break

    if tx_id is None:
        return None

    timestamp = ""

    ts = re.search(
        r'(\d{2}-\d{2}-\d{2}\s+(?:AM|PM)\s+\d{1,2}:\d{2})',
        text,
        re.IGNORECASE
    )

    if ts:
        timestamp = ts.group(1)

    return {
        "transaction_id": tx_id,
        "amount": amount,
        "sign": sign,
        "timestamp": timestamp,
        "raw_text": text
    }


if __name__ == "__main__":

    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Missing PDF path"
        }))
        sys.exit(1)

    try:
        result = parse_pdf(sys.argv[1])
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }, ensure_ascii=False))
        sys.exit(1)
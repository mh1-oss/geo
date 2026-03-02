import sys
try:
    from pypdf import PdfReader
except ImportError:
    print("pypdf not installed")
    sys.exit(1)

reader = PdfReader("dist/55555.pdf")
text = ""
for page in reader.pages:
    text += page.extract_text() + "\n"

with open("pdf_output.txt", "w", encoding="utf-8") as f:
    f.write(text)
print("Done extracting to pdf_output.txt")

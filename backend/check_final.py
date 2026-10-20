with open('test/final.certification.ts', 'r') as f:
    c = f.read()

c = c.replace("// name:", "name:")
c = c.replace("quantity: 150", "quantity: 150") # To verify... actually, I'll just restore the whole file!

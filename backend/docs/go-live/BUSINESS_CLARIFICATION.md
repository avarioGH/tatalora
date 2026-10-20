# ERP Business Clarification Document

Phase 52 found no TRUE MISSING foundational ERP process in the available Excel evidence. The remaining items are business-semantic ambiguities that cannot safely be resolved by engineering inference.

# A. GRADING

Known Excel evidence:
- GRADE, HASIL GRADE, A, B, C, LKL, AF, GRADE APM, GRADE BKR

### Question G1
Are Grade A / B / C actual physical quality grades?
Answer:
[ ] YES
[ ] NO
[ ] PARTIALLY
[ ] UNKNOWN

Business explanation:
____________________________

### Question G2
What exactly determines Grade A/B/C?
Please provide any measurable rules for:
- pinholes
- sapwood
- gerowong
- cracks
- knots
- dimensions
- other defects

Answer:
____________________________

If no formal rule exists:
[ ] Manual visual classification

### Question G3
What does LKL mean?
[ ] Quality grade
[ ] Local-market classification
[ ] Sales destination
[ ] Product category
[ ] Other
[ ] Unknown

Explanation:
____________________________

### Question G4
What does AF mean?
[ ] Afkir / Reject
[ ] Quality grade
[ ] Sales classification
[ ] Waste
[ ] Other
[ ] Unknown

Explanation:
____________________________

### Question G5
What does APM mean?
Full meaning:
____________________________
Business purpose:
____________________________

### Question G6
What does BKR mean?
Full meaning:
____________________________
Business purpose:
____________________________

### Question G7
Does grading happen:
[ ] Before production
[ ] During production
[ ] After production
[ ] Multiple stages

Explanation:
____________________________

# B. FUSO / LOADING

Known Excel evidence:
- DATA MUAT, FUSO 01, TRUCK, TGL, multiple physical Fuso references

### Question F1
Can one Delivery Order / Surat Jalan be fulfilled using multiple Fuso trucks?
[ ] YES
[ ] NO
[ ] DEPENDS

Explanation:
____________________________

### Question F2
If YES:
Example:
DO 001
Truck 1: Fuso: PCS: M3:
Truck 2: Fuso: PCS: M3:
Is this valid business operation?
[ ] YES
[ ] NO

### Question F3
Does every Fuso require its own:
[ ] Surat Jalan
[ ] Loading record
[ ] Driver
[ ] Vehicle
[ ] Tally
[ ] Signature
[ ] Other

Explanation:
____________________________

### Question F4
Is "Loading" a separate business transaction from Shipment?
[ ] YES
[ ] NO
[ ] Same transaction

Explanation:
____________________________

# C. PROJECT VS CUSTOMER

### Question P1
Does one Customer have multiple independent projects that need separate tracking?
[ ] YES
[ ] NO

### Question P2
If YES, does the business require a Project master?
[ ] YES
[ ] NO
[ ] NOT SURE
Project example:
____________________________

# D. HISTORICAL DATA DECISION

Known historical residuals:
RawLog: 6, TrimmedLog: 5, InputLog: 4, SawnTimberOutput: 1 (Total = 16)

### Question H1
Should these 16 historical records:
[ ] Be retained permanently
[ ] Be retained as historical/legacy records
[ ] Be archived
[ ] Be deleted after explicit approval
[ ] Other

### Question H2
Are these records considered:
[ ] Real historical business data
[ ] Test data
[ ] Seed data
[ ] Mixed
[ ] Unknown

# E. RTO / RPO SLA DECISION

### RTO
Maximum acceptable ERP downtime:
[ ] < 1 hour
[ ] 1–4 hours
[ ] 4–8 hours
[ ] 8–24 hours
[ ] Other
Exact target: ________________

### RPO
Maximum acceptable data loss:
[ ] < 15 minutes
[ ] < 1 hour
[ ] 1–4 hours
[ ] 1 day
[ ] Other
Exact target: ________________

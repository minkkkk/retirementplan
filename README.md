# Retirement Planner

A simple single-person retirement planning simulator built as a static website for GitHub Pages.

## What it does

This tool simulates retirement finances from your current age through age 100.

You can enter:

- current age
- retirement age
- end age
- annual spending goal
- 401(k) balance, contribution, and growth rates
- IRA balance, contribution, and growth rates
- brokerage balance, contribution, and growth rates
- monthly pension amount and start age
- monthly Social Security amount and start age

The planner then estimates:

- portfolio value by age
- account balances by age
- retirement income from pension and Social Security
- automatic withdrawals needed to fund your spending goal
- first shortfall age
- depletion age
- assets remaining at the end of the plan

---

## Version 1 assumptions

This version is intentionally simple.

### Core assumptions

- one person only
- all values are in USD
- simulation runs annually
- default planning horizon ends at age 100
- contributions stop at retirement age
- each account has separate growth assumptions before and after retirement
- retirement spending gap is automatically funded after guaranteed income
- withdrawal order is:

1. Brokerage
2. IRA
3. 401(k)

### Not included in version 1

- taxes
- inflation
- RMDs
- Roth conversions
- healthcare costs
- one-time expenses
- Monte Carlo simulation
- custom withdrawal order

---

## Calculation flow

### Before retirement
For each year before retirement:

1. start with current balances
2. add annual contributions
3. apply pre-retirement growth rate
4. no retirement withdrawals are taken

### After retirement
For each year after retirement:

1. start with current balances
2. contributions are set to 0
3. apply post-retirement growth rate
4. calculate pension and Social Security income if started
5. compare guaranteed income to annual spending goal
6. withdraw any remaining gap from Brokerage → IRA → 401(k)

If total funds are not enough to cover the spending goal, the remaining unmet amount is shown as a shortfall.

---

## File structure

```text
retirement-planner/
├─ index.html
├─ style.css
├─ script.js
└─ README.md
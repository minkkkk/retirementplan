# Retirement Planner

A single-person retirement planning simulator built as a static website for GitHub Pages.

## Features

- annual retirement simulation through age 100
- 401(k), IRA, and brokerage accounts
- separate pre-retirement and post-retirement growth assumptions
- pension and Social Security income
- automatic retirement withdrawals to fund spending gap
- summary cards
- charts and year-by-year results table
- retirement age optimization using grid search

## Version 1 assumptions

- one person only
- all values are in USD
- annual simulation
- contributions stop at retirement age
- spending goal applies only after retirement
- guaranteed income = pension + Social Security
- withdrawal order = Brokerage → IRA → 401(k)
- taxes and inflation are not included

## Retirement age optimization

This app uses a simple grid search across a user-defined retirement age range.

For each candidate retirement age, the planner runs the full simulation and then selects a recommendation based on one of these methods:

- Earliest feasible
- Maximum end assets
- Earliest meeting minimum end assets
- Recommended with safety margin

### Definitions

- **Feasible**: no shortfall and no depletion before end age
- **Minimum end assets**: user-defined target remaining at end age
- **Safety margin**: user-defined larger cushion at end age

## Calculation flow

### Before retirement
1. start with current balances
2. add annual contributions
3. apply pre-retirement growth
4. no retirement withdrawals

### After retirement
1. start with current balances
2. contributions become 0
3. apply post-retirement growth
4. calculate pension and Social Security
5. compare guaranteed income to annual retirement spending goal
6. withdraw the gap from Brokerage → IRA → 401(k)

## File structure

```text
retirement-planner/
├─ index.html
├─ style.css
├─ script.js
└─ README.md
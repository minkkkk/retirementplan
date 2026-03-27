# Retirement Planner

A household retirement planning simulator built as a static web app (GitHub Pages compatible).

This tool models long-term financial outcomes for single individuals or couples, including retirement timing, investment growth, guaranteed income, and optional child-related expenses.

---

## 🚀 Features

- Annual retirement simulation through a selected end age
- Supports **single or couple households**
- Accounts:
  - 401(k)
  - IRA
  - Brokerage
- Separate **pre-retirement and post-retirement growth rates**
- **Pension + Social Security income**
- **Inflation-adjusted retirement spending**
- Optional **child-related costs**
  - College (4-year default)
  - Wedding support
- Retirement age optimization (grid search)
- Summary dashboard + charts + detailed yearly table
- Local storage (auto-save inputs)

---

## 🧠 Core Model Assumptions

### 1. Retirement Definition

Retirement age is the point where:

- Contributions **stop**
- Retirement spending **begins**

---

### 2. Inflation Model

- The **Annual Retirement Spending Goal** is entered in **today’s dollars**
- At retirement:
  - Spending is inflated to future value
- After retirement:
  - Spending increases each year with inflation

---

### 3. Contribution Rules

| Phase | 401(k) | IRA | Brokerage |
|------|--------|-----|-----------|
| Before retirement | Contribute | Contribute | Contribute |
| After retirement | ❌ Stop | ❌ Stop | ❌ Stop |

Applied separately to:
- Primary
- Spouse

---

### 4. Withdrawal Order

Withdrawals follow a strict order:

```text
Brokerage → IRA → 401(k)
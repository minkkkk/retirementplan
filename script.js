let portfolioChartInstance = null;
let balancesChartInstance = null;
let incomeChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadExampleScenario();
  runSimulation();
});

function bindEvents() {
  document.getElementById("runBtn").addEventListener("click", runSimulation);
  document.getElementById("exampleBtn").addEventListener("click", () => {
    loadExampleScenario();
    runSimulation();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    resetForm();
    hideErrors();
    clearOutputs();
  });
}

function loadExampleScenario() {
  const defaults = {
    currentAge: 40,
    retirementAge: 60,
    endAge: 100,
    annualSpendingGoal: 120000,

    k401Balance: 320000,
    k401Contribution: 23000,
    k401PreGrowth: 7,
    k401PostGrowth: 5,

    iraBalance: 110000,
    iraContribution: 7000,
    iraPreGrowth: 6,
    iraPostGrowth: 5,

    brokerageBalance: 180000,
    brokerageContribution: 12000,
    brokeragePreGrowth: 5.5,
    brokeragePostGrowth: 4.5,

    pensionMonthly: 2200,
    pensionStartAge: 65,

    socialMonthly: 3200,
    socialStartAge: 67
  };

  Object.entries(defaults).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

function resetForm() {
  document.getElementById("planner-form").reset();
}

function getInputs() {
  return {
    currentAge: getNumber("currentAge"),
    retirementAge: getNumber("retirementAge"),
    endAge: getNumber("endAge"),
    annualSpendingGoal: getNumber("annualSpendingGoal"),

    accounts: {
      k401: {
        name: "401(k)",
        balance: getNumber("k401Balance"),
        contribution: getNumber("k401Contribution"),
        preGrowth: percentToDecimal(getNumber("k401PreGrowth")),
        postGrowth: percentToDecimal(getNumber("k401PostGrowth"))
      },
      ira: {
        name: "IRA",
        balance: getNumber("iraBalance"),
        contribution: getNumber("iraContribution"),
        preGrowth: percentToDecimal(getNumber("iraPreGrowth")),
        postGrowth: percentToDecimal(getNumber("iraPostGrowth"))
      },
      brokerage: {
        name: "Brokerage",
        balance: getNumber("brokerageBalance"),
        contribution: getNumber("brokerageContribution"),
        preGrowth: percentToDecimal(getNumber("brokeragePreGrowth")),
        postGrowth: percentToDecimal(getNumber("brokeragePostGrowth"))
      }
    },

    pension: {
      monthlyAmount: getNumber("pensionMonthly"),
      startAge: getNumber("pensionStartAge")
    },

    social: {
      monthlyAmount: getNumber("socialMonthly"),
      startAge: getNumber("socialStartAge")
    },

    withdrawalOrder: ["brokerage", "ira", "k401"]
  };
}

function validateInputs(inputs) {
  const errors = [];

  if (inputs.currentAge < 0 || inputs.currentAge > 120) {
    errors.push("Current age must be between 0 and 120.");
  }

  if (inputs.retirementAge <= inputs.currentAge) {
    errors.push("Retirement age must be greater than current age.");
  }

  if (inputs.endAge < inputs.retirementAge) {
    errors.push("End age must be greater than or equal to retirement age.");
  }

  if (inputs.endAge > 120) {
    errors.push("End age must be 120 or less.");
  }

  if (inputs.annualSpendingGoal < 0) {
    errors.push("Annual spending goal cannot be negative.");
  }

  for (const [key, account] of Object.entries(inputs.accounts)) {
    if (account.balance < 0) {
      errors.push(`${account.name} balance cannot be negative.`);
    }
    if (account.contribution < 0) {
      errors.push(`${account.name} annual contribution cannot be negative.`);
    }
    if (account.preGrowth <= -1 || account.preGrowth > 1) {
      errors.push(`${account.name} pre-retirement growth rate looks invalid.`);
    }
    if (account.postGrowth <= -1 || account.postGrowth > 1) {
      errors.push(`${account.name} post-retirement growth rate looks invalid.`);
    }
  }

  if (inputs.pension.monthlyAmount < 0) {
    errors.push("Monthly pension cannot be negative.");
  }

  if (inputs.social.monthlyAmount < 0) {
    errors.push("Monthly Social Security cannot be negative.");
  }

  if (inputs.pension.startAge < inputs.currentAge) {
    errors.push("Pension start age must be at least current age.");
  }

  if (inputs.social.startAge < inputs.currentAge) {
    errors.push("Social Security start age must be at least current age.");
  }

  return errors;
}

function runSimulation() {
  hideErrors();

  const inputs = getInputs();
  const errors = validateInputs(inputs);

  if (errors.length > 0) {
    showErrors(errors);
    clearOutputs();
    return;
  }

  const rows = simulatePlan(inputs);
  const summary = buildSummary(rows, inputs);

  renderSummary(summary);
  renderCharts(rows, inputs);
  renderTable(rows);
}

function simulatePlan(inputs) {
  const rows = [];

  let balances = {
    k401: inputs.accounts.k401.balance,
    ira: inputs.accounts.ira.balance,
    brokerage: inputs.accounts.brokerage.balance
  };

  for (let age = inputs.currentAge; age <= inputs.endAge; age++) {
    const isRetired = age >= inputs.retirementAge;

    const startBalances = {
      k401: balances.k401,
      ira: balances.ira,
      brokerage: balances.brokerage
    };

    const contributions = {
      k401: isRetired ? 0 : inputs.accounts.k401.contribution,
      ira: isRetired ? 0 : inputs.accounts.ira.contribution,
      brokerage: isRetired ? 0 : inputs.accounts.brokerage.contribution
    };

    const growthRates = {
      k401: isRetired ? inputs.accounts.k401.postGrowth : inputs.accounts.k401.preGrowth,
      ira: isRetired ? inputs.accounts.ira.postGrowth : inputs.accounts.ira.preGrowth,
      brokerage: isRetired ? inputs.accounts.brokerage.postGrowth : inputs.accounts.brokerage.preGrowth
    };

    const afterContributionBalances = {
      k401: startBalances.k401 + contributions.k401,
      ira: startBalances.ira + contributions.ira,
      brokerage: startBalances.brokerage + contributions.brokerage
    };

    const afterGrowthBalances = {
      k401: afterContributionBalances.k401 * (1 + growthRates.k401),
      ira: afterContributionBalances.ira * (1 + growthRates.ira),
      brokerage: afterContributionBalances.brokerage * (1 + growthRates.brokerage)
    };

    const pensionIncome = age >= inputs.pension.startAge ? inputs.pension.monthlyAmount * 12 : 0;
    const socialIncome = age >= inputs.social.startAge ? inputs.social.monthlyAmount * 12 : 0;
    const guaranteedIncome = pensionIncome + socialIncome;

    const spendingGoal = isRetired ? inputs.annualSpendingGoal : 0;
    const spendingGap = Math.max(0, spendingGoal - guaranteedIncome);

    const withdrawalResult = isRetired
      ? withdrawForGap(spendingGap, afterGrowthBalances, inputs.withdrawalOrder)
      : {
          withdrawals: { brokerage: 0, ira: 0, k401: 0 },
          totalWithdrawal: 0,
          unmetGap: 0,
          remainingBalances: { ...afterGrowthBalances }
        };

    const endBalances = withdrawalResult.remainingBalances;
    const totalAssetsEnd = endBalances.k401 + endBalances.ira + endBalances.brokerage;

    rows.push({
      age,
      isRetired,
      startBalances,
      contributions,
      growthRates,
      income: {
        pension: pensionIncome,
        social: socialIncome,
        guaranteed: guaranteedIncome
      },
      spendingGoal,
      withdrawals: {
        brokerage: withdrawalResult.withdrawals.brokerage,
        ira: withdrawalResult.withdrawals.ira,
        k401: withdrawalResult.withdrawals.k401,
        total: withdrawalResult.totalWithdrawal
      },
      shortfall: withdrawalResult.unmetGap,
      endBalances,
      totalAssetsEnd
    });

    balances = { ...endBalances };
  }

  return rows;
}

function withdrawForGap(gap, balances, order) {
  let remainingGap = gap;
  const workingBalances = { ...balances };
  const withdrawals = {
    brokerage: 0,
    ira: 0,
    k401: 0
  };

  for (const accountKey of order) {
    if (remainingGap <= 0) break;

    const available = Math.max(0, workingBalances[accountKey]);
    const withdrawal = Math.min(available, remainingGap);

    withdrawals[accountKey] = withdrawal;
    workingBalances[accountKey] -= withdrawal;
    remainingGap -= withdrawal;
  }

  return {
    withdrawals,
    totalWithdrawal: withdrawals.brokerage + withdrawals.ira + withdrawals.k401,
    unmetGap: remainingGap,
    remainingBalances: workingBalances
  };
}

function buildSummary(rows, inputs) {
  const firstRow = rows[0];
  const retirementRow = rows.find(row => row.age === inputs.retirementAge);
  const lastRow = rows[rows.length - 1];
  const firstShortfallRow = rows.find(row => row.shortfall > 0);
  const depletionRow = rows.find(row => row.totalAssetsEnd <= 0.01);

  const totalAssetsToday =
    firstRow.startBalances.k401 +
    firstRow.startBalances.ira +
    firstRow.startBalances.brokerage;

  const guaranteedIncomeAtRetirement = retirementRow
    ? retirementRow.income.guaranteed
    : 0;

  const status = getPlanStatus(lastRow, firstShortfallRow, depletionRow);

  return {
    totalAssetsToday,
    portfolioAtRetirement: retirementRow ? retirementRow.totalAssetsEnd : 0,
    assetsRemainingAtEnd: lastRow.totalAssetsEnd,
    annualSpendingGoal: inputs.annualSpendingGoal,
    guaranteedIncomeAtRetirement,
    firstShortfallAge: firstShortfallRow ? firstShortfallRow.age : "None",
    depletionAge: depletionRow ? depletionRow.age : "None",
    status
  };
}

function getPlanStatus(lastRow, firstShortfallRow, depletionRow) {
  if (depletionRow) {
    return { text: "Warning: Assets depleted before end age", className: "status-bad" };
  }

  if (firstShortfallRow) {
    return { text: "Warning: Spending goal not fully met in some years", className: "status-warning" };
  }

  if (lastRow.totalAssetsEnd > 0) {
    return { text: "On Track through end age", className: "status-good" };
  }

  return { text: "Needs review", className: "status-warning" };
}

function renderSummary(summary) {
  const container = document.getElementById("summaryCards");

  const cards = [
    { label: "Total Assets Today", value: formatCurrency(summary.totalAssetsToday) },
    { label: "Portfolio at Retirement", value: formatCurrency(summary.portfolioAtRetirement) },
    { label: "Assets Remaining at End Age", value: formatCurrency(summary.assetsRemainingAtEnd) },
    { label: "Annual Spending Goal", value: formatCurrency(summary.annualSpendingGoal) },
    { label: "Guaranteed Income at Retirement", value: formatCurrency(summary.guaranteedIncomeAtRetirement) },
    { label: "First Shortfall Age", value: summary.firstShortfallAge },
    { label: "Depletion Age", value: summary.depletionAge },
    { label: "Plan Status", value: summary.status.text, className: summary.status.className }
  ];

  container.innerHTML = cards
    .map(card => {
      return `
        <div class="summary-card ${card.className || ""}">
          <div class="label">${escapeHtml(card.label)}</div>
          <div class="value">${escapeHtml(String(card.value))}</div>
        </div>
      `;
    })
    .join("");
}

function renderCharts(rows, inputs) {
  const ages = rows.map(row => row.age);
  const totalPortfolio = rows.map(row => roundMoney(row.totalAssetsEnd));
  const k401Data = rows.map(row => roundMoney(row.endBalances.k401));
  const iraData = rows.map(row => roundMoney(row.endBalances.ira));
  const brokerageData = rows.map(row => roundMoney(row.endBalances.brokerage));
  const guaranteedIncome = rows.map(row => roundMoney(row.income.guaranteed));
  const withdrawals = rows.map(row => roundMoney(row.withdrawals.total));
  const spendingGoal = rows.map(row => roundMoney(row.spendingGoal));

  if (portfolioChartInstance) portfolioChartInstance.destroy();
  if (balancesChartInstance) balancesChartInstance.destroy();
  if (incomeChartInstance) incomeChartInstance.destroy();

  portfolioChartInstance = new Chart(document.getElementById("portfolioChart"), {
    type: "line",
    data: {
      labels: ages,
      datasets: [
        {
          label: "Total Portfolio",
          data: totalPortfolio,
          tension: 0.25
        }
      ]
    },
    options: getCurrencyChartOptions("Portfolio Value ($)")
  });

  balancesChartInstance = new Chart(document.getElementById("balancesChart"), {
    type: "line",
    data: {
      labels: ages,
      datasets: [
        {
          label: "401(k)",
          data: k401Data,
          tension: 0.25
        },
        {
          label: "IRA",
          data: iraData,
          tension: 0.25
        },
        {
          label: "Brokerage",
          data: brokerageData,
          tension: 0.25
        }
      ]
    },
    options: getCurrencyChartOptions("Account Balance ($)")
  });

  incomeChartInstance = new Chart(document.getElementById("incomeChart"), {
    type: "line",
    data: {
      labels: ages,
      datasets: [
        {
          label: "Guaranteed Income",
          data: guaranteedIncome,
          tension: 0.25
        },
        {
          label: "Withdrawals",
          data: withdrawals,
          tension: 0.25
        },
        {
          label: "Spending Goal",
          data: spendingGoal,
          tension: 0.25
        }
      ]
    },
    options: getCurrencyChartOptions("Annual Amount ($)")
  });
}

function getCurrencyChartOptions(yAxisLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: {
        position: "bottom"
      },
      tooltip: {
        callbacks: {
          label(context) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: yAxisLabel
        },
        ticks: {
          callback(value) {
            return compactCurrency(value);
          }
        }
      },
      x: {
        title: {
          display: true,
          text: "Age"
        }
      }
    }
  };
}

function renderTable(rows) {
  const tbody = document.getElementById("resultsTableBody");

  tbody.innerHTML = rows
    .map(row => {
      return `
        <tr>
          <td>${row.age}</td>
          <td>${formatCurrency(row.startBalances.k401)}</td>
          <td>${formatCurrency(row.startBalances.ira)}</td>
          <td>${formatCurrency(row.startBalances.brokerage)}</td>
          <td>${formatCurrency(row.income.pension)}</td>
          <td>${formatCurrency(row.income.social)}</td>
          <td>${formatCurrency(row.income.guaranteed)}</td>
          <td>${formatCurrency(row.spendingGoal)}</td>
          <td>${formatCurrency(row.withdrawals.brokerage)}</td>
          <td>${formatCurrency(row.withdrawals.ira)}</td>
          <td>${formatCurrency(row.withdrawals.k401)}</td>
          <td>${formatCurrency(row.withdrawals.total)}</td>
          <td>${formatCurrency(row.shortfall)}</td>
          <td>${formatCurrency(row.endBalances.k401)}</td>
          <td>${formatCurrency(row.endBalances.ira)}</td>
          <td>${formatCurrency(row.endBalances.brokerage)}</td>
          <td>${formatCurrency(row.totalAssetsEnd)}</td>
        </tr>
      `;
    })
    .join("");
}

function clearOutputs() {
  document.getElementById("summaryCards").innerHTML = "";
  document.getElementById("resultsTableBody").innerHTML = "";

  if (portfolioChartInstance) {
    portfolioChartInstance.destroy();
    portfolioChartInstance = null;
  }
  if (balancesChartInstance) {
    balancesChartInstance.destroy();
    balancesChartInstance = null;
  }
  if (incomeChartInstance) {
    incomeChartInstance.destroy();
    incomeChartInstance = null;
  }
}

function showErrors(errors) {
  const box = document.getElementById("errorBox");
  box.innerHTML = errors.map(err => `<div>• ${escapeHtml(err)}</div>`).join("");
  box.classList.remove("hidden");
}

function hideErrors() {
  const box = document.getElementById("errorBox");
  box.innerHTML = "";
  box.classList.add("hidden");
}

function getNumber(id) {
  const value = document.getElementById(id).value;
  if (value === "" || value === null) return 0;
  return Number(value);
}

function percentToDecimal(value) {
  return value / 100;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function compactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
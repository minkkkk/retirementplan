let portfolioChartInstance = null;
let balancesChartInstance = null;
let incomeChartInstance = null;
let lastOptimizationResult = null;

const STORAGE_KEY = "retirementPlannerV3";

const COLLEGE_START_AGE = 19;
const COLLEGE_YEARS = 4;
const WEDDING_SUPPORT_AGE = 30;

const MAX_RETIREMENT_AGE = 100;
const MAX_END_AGE = 120;

const DEFAULTS = {
  householdType: "single",
  childrenCount: 0,

  primaryCurrentAge: 40,
  primaryRetirementAge: 60,

  spouseCurrentAge: 38,
  spouseRetirementAge: 60,

  primary401kBalance: 180000,
  primary401kContribution: 23000,
  primaryIraBalance: 45000,
  primaryIraContribution: 7000,
  primaryBrokerageBalance: 60000,
  primaryBrokerageContribution: 12000,

  spouse401kBalance: 90000,
  spouse401kContribution: 12000,
  spouseIraBalance: 25000,
  spouseIraContribution: 3000,
  spouseBrokerageBalance: 40000,
  spouseBrokerageContribution: 6000,

  k401PreGrowth: 7,
  k401PostGrowth: 5,
  iraPreGrowth: 7,
  iraPostGrowth: 5,
  brokeragePreGrowth: 6,
  brokeragePostGrowth: 4.5,

  primaryPensionMonthly: 0,
  primaryPensionStartAge: 65,
  primarySocialMonthly: 2500,
  primarySocialStartAge: 67,

  spousePensionMonthly: 0,
  spousePensionStartAge: 65,
  spouseSocialMonthly: 1800,
  spouseSocialStartAge: 67,

  endAge: 95,
  annualSpendingGoal: 100000,
  inflationRate: 3,
  k401AccessAge: 60,

  optPrimaryStartAge: 45,
  optPrimaryEndAge: 70,
  optSpouseStartAge: 45,
  optSpouseEndAge: 70,
  safetyMargin: 250000,
  optimizationScope: "primary",
  optimizationMethod: "earliest_feasible",

  children: []
};

document.addEventListener("DOMContentLoaded", () => {
  setDefaults();
  hydrateFromStorage();
  bindEvents();
  toggleCoupleSections();
  toggleOptimizationScopeUI();
  renderChildrenInputs(getNumber("childrenCount"));
  runSimulation();
});

function bindEvents() {
  document.getElementById("householdType").addEventListener("change", () => {
    toggleCoupleSections();
    toggleOptimizationScopeUI();
    saveInputsToStorage();
  });

  document.getElementById("childrenCount").addEventListener("change", () => {
    const count = clamp(Math.floor(getNumber("childrenCount")), 0, 10);
    document.getElementById("childrenCount").value = count;
    renderChildrenInputs(count);
    saveInputsToStorage();
  });

  document.getElementById("runBtn").addEventListener("click", runSimulation);
  document.getElementById("exampleBtn").addEventListener("click", loadExample);
  document.getElementById("resetBtn").addEventListener("click", resetAll);
  document.getElementById("findRecommendedBtn").addEventListener("click", findRecommendedAge);
  document.getElementById("applyRecommendedBtn").addEventListener("click", applyRecommendedAge);

  document.getElementById("planner-form").addEventListener("input", () => {
    saveInputsToStorage();
  });
}

function setDefaults() {
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    if (Array.isArray(value)) return;
    const el = document.getElementById(key);
    if (!el) return;
    el.value = value;
  });
}

function loadExample() {
  setDefaults();

  document.getElementById("householdType").value = "couple";
  document.getElementById("childrenCount").value = 2;

  document.getElementById("primaryCurrentAge").value = 42;
  document.getElementById("primaryRetirementAge").value = 61;
  document.getElementById("spouseCurrentAge").value = 40;
  document.getElementById("spouseRetirementAge").value = 60;

  document.getElementById("primary401kBalance").value = 220000;
  document.getElementById("primary401kContribution").value = 23000;
  document.getElementById("primaryIraBalance").value = 70000;
  document.getElementById("primaryIraContribution").value = 7000;
  document.getElementById("primaryBrokerageBalance").value = 90000;
  document.getElementById("primaryBrokerageContribution").value = 15000;

  document.getElementById("spouse401kBalance").value = 150000;
  document.getElementById("spouse401kContribution").value = 18000;
  document.getElementById("spouseIraBalance").value = 40000;
  document.getElementById("spouseIraContribution").value = 5000;
  document.getElementById("spouseBrokerageBalance").value = 50000;
  document.getElementById("spouseBrokerageContribution").value = 8000;

  document.getElementById("annualSpendingGoal").value = 115000;
  document.getElementById("endAge").value = 95;
  document.getElementById("k401AccessAge").value = 60;

  document.getElementById("primarySocialMonthly").value = 2800;
  document.getElementById("spouseSocialMonthly").value = 2200;

  document.getElementById("optPrimaryStartAge").value = 50;
  document.getElementById("optPrimaryEndAge").value = 70;
  document.getElementById("optSpouseStartAge").value = 50;
  document.getElementById("optSpouseEndAge").value = 70;
  document.getElementById("optimizationScope").value = "both";
  document.getElementById("optimizationMethod").value = "earliest_feasible";

  toggleCoupleSections();
  toggleOptimizationScopeUI();
  renderChildrenInputs(2);

  setChildValues([
    {
      currentAge: 12,
      includeCollege: true,
      collegeTotalCost: 180000,
      parentPayPct: 70,
      includeWedding: true,
      weddingAmount: 30000
    },
    {
      currentAge: 8,
      includeCollege: true,
      collegeTotalCost: 180000,
      parentPayPct: 60,
      includeWedding: true,
      weddingAmount: 25000
    }
  ]);

  saveInputsToStorage();
  runSimulation();
}

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  setDefaults();
  document.getElementById("childrenCount").value = 0;
  toggleCoupleSections();
  toggleOptimizationScopeUI();
  renderChildrenInputs(0);
  clearOutputs();
  clearOptimizationOutput();
  hideErrors();
}

function toggleCoupleSections() {
  const isCouple = getValue("householdType") === "couple";
  document.getElementById("spousePersonalSection").classList.toggle("hidden", !isCouple);
  document.getElementById("spouseAccountsSection").classList.toggle("hidden", !isCouple);
  document.getElementById("spouseIncomePanel").classList.toggle("hidden", !isCouple);
}

function toggleOptimizationScopeUI() {
  const isCouple = getValue("householdType") === "couple";
  const spouseStartWrap = document.getElementById("spouseOptStartWrap");
  const spouseEndWrap = document.getElementById("spouseOptEndWrap");
  const scopeEl = document.getElementById("optimizationScope");

  if (spouseStartWrap) spouseStartWrap.classList.toggle("hidden", !isCouple);
  if (spouseEndWrap) spouseEndWrap.classList.toggle("hidden", !isCouple);

  if (!scopeEl) return;

  Array.from(scopeEl.options).forEach(opt => {
    if (opt.value === "both") {
      opt.disabled = !isCouple;
    } else {
      opt.disabled = false;
    }
  });

  if (!isCouple) {
    scopeEl.value = "primary";
  }
}

function renderChildrenInputs(count) {
  const container = document.getElementById("childrenContainer");
  container.innerHTML = "";

  if (count <= 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  for (let i = 0; i < count; i++) {
    const child = DEFAULTS.children[i] || {
      currentAge: 5,
      includeCollege: true,
      collegeTotalCost: 120000,
      parentPayPct: 50,
      includeWedding: true,
      weddingAmount: 30000
    };

    const card = document.createElement("div");
    card.className = "child-card";
    card.innerHTML = `
      <h3>Child ${i + 1}</h3>
      <div class="grid child-compact-grid">
        <label>
          Age
          <input type="number" id="childAge_${i}" min="0" max="40" step="1" value="${child.currentAge}" />
        </label>

        <label class="checkbox-inline">
          <span>College</span>
          <input type="checkbox" id="childCollegeEnabled_${i}" ${child.includeCollege ? "checked" : ""} />
        </label>

        <label>
          College Total
          <input type="number" id="childCollegeCost_${i}" min="0" step="1000" value="${child.collegeTotalCost}" />
        </label>

        <label>
          Parent %
          <input type="number" id="childCollegePct_${i}" min="0" max="100" step="1" value="${child.parentPayPct}" />
        </label>

        <label class="checkbox-inline">
          <span>Wedding</span>
          <input type="checkbox" id="childWeddingEnabled_${i}" ${child.includeWedding ? "checked" : ""} />
        </label>

        <label>
          Wedding Amount
          <input type="number" id="childWeddingAmount_${i}" min="0" step="1000" value="${child.weddingAmount}" />
        </label>
      </div>
    `;
    container.appendChild(card);
  }
}

function setChildValues(children) {
  document.getElementById("childrenCount").value = children.length;
  renderChildrenInputs(children.length);

  children.forEach((child, i) => {
    setIfExists(`childAge_${i}`, child.currentAge);
    setIfExists(`childCollegeCost_${i}`, child.collegeTotalCost);
    setIfExists(`childCollegePct_${i}`, child.parentPayPct);
    setIfExists(`childWeddingAmount_${i}`, child.weddingAmount);

    const collegeEnabled = document.getElementById(`childCollegeEnabled_${i}`);
    const weddingEnabled = document.getElementById(`childWeddingEnabled_${i}`);
    if (collegeEnabled) collegeEnabled.checked = !!child.includeCollege;
    if (weddingEnabled) weddingEnabled.checked = !!child.includeWedding;
  });
}

function setIfExists(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function hydrateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    Object.entries(saved).forEach(([key, value]) => {
      if (key === "children") return;
      const el = document.getElementById(key);
      if (!el) return;
      el.value = value;
    });

    toggleCoupleSections();
    toggleOptimizationScopeUI();

    const count = clamp(Number(saved.childrenCount || 0), 0, 10);
    document.getElementById("childrenCount").value = count;
    renderChildrenInputs(count);

    if (Array.isArray(saved.children)) {
      setChildValues(saved.children.slice(0, count));
    }
  } catch (err) {
    console.error("Failed to hydrate storage", err);
  }
}

function saveInputsToStorage() {
  try {
    const inputs = getInputs();
    const flat = {
      householdType: inputs.householdType,
      childrenCount: inputs.children.length,

      primaryCurrentAge: inputs.primary.currentAge,
      primaryRetirementAge: inputs.primary.retirementAge,

      spouseCurrentAge: inputs.spouse.currentAge,
      spouseRetirementAge: inputs.spouse.retirementAge,

      primary401kBalance: inputs.primary.accounts.k401.balance,
      primary401kContribution: inputs.primary.accounts.k401.contribution,
      primaryIraBalance: inputs.primary.accounts.ira.balance,
      primaryIraContribution: inputs.primary.accounts.ira.contribution,
      primaryBrokerageBalance: inputs.primary.accounts.brokerage.balance,
      primaryBrokerageContribution: inputs.primary.accounts.brokerage.contribution,

      spouse401kBalance: inputs.spouse.accounts.k401.balance,
      spouse401kContribution: inputs.spouse.accounts.k401.contribution,
      spouseIraBalance: inputs.spouse.accounts.ira.balance,
      spouseIraContribution: inputs.spouse.accounts.ira.contribution,
      spouseBrokerageBalance: inputs.spouse.accounts.brokerage.balance,
      spouseBrokerageContribution: inputs.spouse.accounts.brokerage.contribution,

      k401PreGrowth: inputs.growth.k401.pre * 100,
      k401PostGrowth: inputs.growth.k401.post * 100,
      iraPreGrowth: inputs.growth.ira.pre * 100,
      iraPostGrowth: inputs.growth.ira.post * 100,
      brokeragePreGrowth: inputs.growth.brokerage.pre * 100,
      brokeragePostGrowth: inputs.growth.brokerage.post * 100,

      primaryPensionMonthly: inputs.primary.income.pensionMonthly,
      primaryPensionStartAge: inputs.primary.income.pensionStartAge,
      primarySocialMonthly: inputs.primary.income.socialMonthly,
      primarySocialStartAge: inputs.primary.income.socialStartAge,

      spousePensionMonthly: inputs.spouse.income.pensionMonthly,
      spousePensionStartAge: inputs.spouse.income.pensionStartAge,
      spouseSocialMonthly: inputs.spouse.income.socialMonthly,
      spouseSocialStartAge: inputs.spouse.income.socialStartAge,

      endAge: inputs.endAge,
      annualSpendingGoal: inputs.annualSpendingGoal,
      inflationRate: inputs.inflationRate * 100,
      k401AccessAge: inputs.k401AccessAge,

      optPrimaryStartAge: inputs.optimization.primaryStartAge,
      optPrimaryEndAge: inputs.optimization.primaryEndAge,
      optSpouseStartAge: inputs.optimization.spouseStartAge,
      optSpouseEndAge: inputs.optimization.spouseEndAge,
      safetyMargin: inputs.optimization.safetyMargin,
      optimizationScope: inputs.optimization.scope,
      optimizationMethod: inputs.optimization.method,

      children: inputs.children
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(flat));
  } catch (err) {
    console.error("Failed to save storage", err);
  }
}

function getInputs() {
  const householdType = getValue("householdType");
  const isCouple = householdType === "couple";

  return {
    householdType,
    primary: {
      currentAge: getNumber("primaryCurrentAge"),
      retirementAge: getNumber("primaryRetirementAge"),
      accounts: {
        k401: {
          balance: getNumber("primary401kBalance"),
          contribution: getNumber("primary401kContribution")
        },
        ira: {
          balance: getNumber("primaryIraBalance"),
          contribution: getNumber("primaryIraContribution")
        },
        brokerage: {
          balance: getNumber("primaryBrokerageBalance"),
          contribution: getNumber("primaryBrokerageContribution")
        }
      },
      income: {
        pensionMonthly: getNumber("primaryPensionMonthly"),
        pensionStartAge: getNumber("primaryPensionStartAge"),
        socialMonthly: getNumber("primarySocialMonthly"),
        socialStartAge: getNumber("primarySocialStartAge")
      }
    },
    spouse: {
      currentAge: isCouple ? getNumber("spouseCurrentAge") : 0,
      retirementAge: isCouple ? getNumber("spouseRetirementAge") : 0,
      accounts: {
        k401: {
          balance: isCouple ? getNumber("spouse401kBalance") : 0,
          contribution: isCouple ? getNumber("spouse401kContribution") : 0
        },
        ira: {
          balance: isCouple ? getNumber("spouseIraBalance") : 0,
          contribution: isCouple ? getNumber("spouseIraContribution") : 0
        },
        brokerage: {
          balance: isCouple ? getNumber("spouseBrokerageBalance") : 0,
          contribution: isCouple ? getNumber("spouseBrokerageContribution") : 0
        }
      },
      income: {
        pensionMonthly: isCouple ? getNumber("spousePensionMonthly") : 0,
        pensionStartAge: isCouple ? getNumber("spousePensionStartAge") : 0,
        socialMonthly: isCouple ? getNumber("spouseSocialMonthly") : 0,
        socialStartAge: isCouple ? getNumber("spouseSocialStartAge") : 0
      }
    },
    growth: {
      k401: {
        pre: getNumber("k401PreGrowth") / 100,
        post: getNumber("k401PostGrowth") / 100
      },
      ira: {
        pre: getNumber("iraPreGrowth") / 100,
        post: getNumber("iraPostGrowth") / 100
      },
      brokerage: {
        pre: getNumber("brokeragePreGrowth") / 100,
        post: getNumber("brokeragePostGrowth") / 100
      }
    },
    endAge: getNumber("endAge"),
    annualSpendingGoal: getNumber("annualSpendingGoal"),
    inflationRate: getNumber("inflationRate") / 100,
    k401AccessAge: getNumber("k401AccessAge"),
    children: getChildrenInputs(),
    optimization: {
      primaryStartAge: getNumber("optPrimaryStartAge"),
      primaryEndAge: getNumber("optPrimaryEndAge"),
      spouseStartAge: getNumber("optSpouseStartAge"),
      spouseEndAge: getNumber("optSpouseEndAge"),
      safetyMargin: getNumber("safetyMargin"),
      scope: getValue("optimizationScope"),
      method: getValue("optimizationMethod")
    }
  };
}

function getChildrenInputs() {
  const count = clamp(Math.floor(getNumber("childrenCount")), 0, 10);
  const children = [];

  for (let i = 0; i < count; i++) {
    const collegeEnabled = document.getElementById(`childCollegeEnabled_${i}`);
    const weddingEnabled = document.getElementById(`childWeddingEnabled_${i}`);

    children.push({
      currentAge: getNumber(`childAge_${i}`),
      includeCollege: collegeEnabled ? collegeEnabled.checked : false,
      collegeTotalCost: getNumber(`childCollegeCost_${i}`),
      parentPayPct: getNumber(`childCollegePct_${i}`),
      includeWedding: weddingEnabled ? weddingEnabled.checked : false,
      weddingAmount: getNumber(`childWeddingAmount_${i}`)
    });
  }

  return children;
}

function validateInputs(inputs) {
  const errors = [];

  if (inputs.primary.currentAge <= 0) {
    errors.push("Primary current age must be greater than 0.");
  }
  if (inputs.primary.retirementAge < inputs.primary.currentAge) {
    errors.push("Primary retirement age must be at least current age.");
  }
  if (inputs.primary.retirementAge > MAX_RETIREMENT_AGE) {
    errors.push(`Primary retirement age cannot be greater than ${MAX_RETIREMENT_AGE}.`);
  }

  if (inputs.endAge < inputs.primary.retirementAge) {
    errors.push("Planning end age must be at least the primary retirement age.");
  }
  if (inputs.endAge > MAX_END_AGE) {
    errors.push(`Planning end age cannot be greater than ${MAX_END_AGE}.`);
  }

  if (inputs.k401AccessAge < 0 || inputs.k401AccessAge > MAX_RETIREMENT_AGE) {
    errors.push(`401(k) withdrawal age must be between 0 and ${MAX_RETIREMENT_AGE}.`);
  }

  if (inputs.householdType === "couple") {
    if (inputs.spouse.currentAge <= 0) {
      errors.push("Spouse current age must be greater than 0.");
    }
    if (inputs.spouse.retirementAge < inputs.spouse.currentAge) {
      errors.push("Spouse retirement age must be at least spouse current age.");
    }
    if (inputs.spouse.retirementAge > MAX_RETIREMENT_AGE) {
      errors.push(`Spouse retirement age cannot be greater than ${MAX_RETIREMENT_AGE}.`);
    }
  }

  const numericChecks = [
    inputs.primary.accounts.k401.balance,
    inputs.primary.accounts.k401.contribution,
    inputs.primary.accounts.ira.balance,
    inputs.primary.accounts.ira.contribution,
    inputs.primary.accounts.brokerage.balance,
    inputs.primary.accounts.brokerage.contribution,
    inputs.spouse.accounts.k401.balance,
    inputs.spouse.accounts.k401.contribution,
    inputs.spouse.accounts.ira.balance,
    inputs.spouse.accounts.ira.contribution,
    inputs.spouse.accounts.brokerage.balance,
    inputs.spouse.accounts.brokerage.contribution,
    inputs.annualSpendingGoal
  ];

  if (numericChecks.some(v => v < 0)) {
    errors.push("Balances, contributions, and spending cannot be negative.");
  }

  inputs.children.forEach((child, i) => {
    if (child.currentAge < 0) {
      errors.push(`Child ${i + 1} age cannot be negative.`);
    }
    if (child.parentPayPct < 0 || child.parentPayPct > 100) {
      errors.push(`Child ${i + 1} parent pay % must be between 0 and 100.`);
    }
    if (child.collegeTotalCost < 0 || child.weddingAmount < 0) {
      errors.push(`Child ${i + 1} support amounts cannot be negative.`);
    }
  });

  return errors;
}

function validateOptimizationInputs(opt, baseInputs) {
  const errors = [];

  if (opt.primaryStartAge < baseInputs.primary.currentAge) {
    errors.push("Primary optimization start age must be at least the primary current age.");
  }
  if (opt.primaryEndAge < opt.primaryStartAge) {
    errors.push("Primary optimization end age must be greater than or equal to the start age.");
  }
  if (opt.primaryEndAge > MAX_RETIREMENT_AGE) {
    errors.push(`Primary optimization end age cannot be greater than ${MAX_RETIREMENT_AGE}.`);
  }
  if (opt.primaryEndAge > baseInputs.endAge) {
    errors.push("Primary optimization end age cannot be greater than the plan end age.");
  }

  if (baseInputs.householdType === "couple") {
    if (opt.spouseStartAge < baseInputs.spouse.currentAge) {
      errors.push("Spouse optimization start age must be at least the spouse current age.");
    }
    if (opt.spouseEndAge < opt.spouseStartAge) {
      errors.push("Spouse optimization end age must be greater than or equal to the spouse start age.");
    }
    if (opt.spouseEndAge > MAX_RETIREMENT_AGE) {
      errors.push(`Spouse optimization end age cannot be greater than ${MAX_RETIREMENT_AGE}.`);
    }
    if (opt.spouseEndAge > baseInputs.endAge) {
      errors.push("Spouse optimization end age cannot be greater than the plan end age.");
    }
  }

  if (opt.safetyMargin < 0) {
    errors.push("Safety margin cannot be negative.");
  }

  if (baseInputs.householdType !== "couple" && opt.scope === "both") {
    errors.push("Both optimization scope requires household type = Couple.");
  }

  return errors;
}

function runSimulation() {
  hideErrors();
  clearOptimizationOutput();
  saveInputsToStorage();

  const inputs = getInputs();
  const errors = validateInputs(inputs);

  if (errors.length > 0) {
    clearOutputs();
    showErrors(errors);
    return;
  }

  const rows = simulatePlan(inputs);
  const summary = buildSummary(rows, inputs);

  renderSummary(summary);
  renderCharts(rows);
  renderTable(rows);
}

function simulatePlan(inputs) {
  const rows = [];

  let balances = {
    k401: inputs.primary.accounts.k401.balance + inputs.spouse.accounts.k401.balance,
    ira: inputs.primary.accounts.ira.balance + inputs.spouse.accounts.ira.balance,
    brokerage: inputs.primary.accounts.brokerage.balance + inputs.spouse.accounts.brokerage.balance
  };

  const startAge = inputs.primary.currentAge;
  const householdRetirementAge = inputs.primary.retirementAge;
  
  let spendingAtAge = 0;

  for (let age = startAge; age <= inputs.endAge; age++) {    
    const startBalances = { ...balances };
    const inRetirementPhase = age >= householdRetirementAge;

    balances.k401 *= 1 + (inRetirementPhase ? inputs.growth.k401.post : inputs.growth.k401.pre);
    balances.ira *= 1 + (inRetirementPhase ? inputs.growth.ira.post : inputs.growth.ira.pre);
    balances.brokerage *= 1 + (inRetirementPhase ? inputs.growth.brokerage.post : inputs.growth.brokerage.pre);

    if (age < inputs.primary.retirementAge) {
      balances.k401 += inputs.primary.accounts.k401.contribution;
      balances.ira += inputs.primary.accounts.ira.contribution;
      balances.brokerage += inputs.primary.accounts.brokerage.contribution;
    }

    if (inputs.householdType === "couple" && age < inputs.spouse.retirementAge) {
      balances.k401 += inputs.spouse.accounts.k401.contribution;
      balances.ira += inputs.spouse.accounts.ira.contribution;
      balances.brokerage += inputs.spouse.accounts.brokerage.contribution;
    }

    const income = getGuaranteedIncomeForAge(inputs, age);
    let baseSpending = 0;

    if (age === householdRetirementAge) {
      const yearsToRetirement = householdRetirementAge - startAge;
      spendingAtAge =
        inputs.annualSpendingGoal *
        Math.pow(1 + inputs.inflationRate, yearsToRetirement);

      baseSpending = spendingAtAge;
    } else if (age > householdRetirementAge) {
      spendingAtAge *= (1 + inputs.inflationRate);
      baseSpending = spendingAtAge;
    }

    const childEvents = getChildEventsForAge(inputs, age);
    const totalNeed = baseSpending + childEvents.total;
    let remainingGap = Math.max(0, totalNeed - income.guaranteed);

    const withdrawals = {
      brokerage: 0,
      ira: 0,
      k401: 0,
      total: 0
    };

    if (remainingGap > 0) {
      const fromBrokerage = Math.min(remainingGap, balances.brokerage);
      balances.brokerage -= fromBrokerage;
      withdrawals.brokerage = fromBrokerage;
      remainingGap -= fromBrokerage;
    }

    if (remainingGap > 0) {
      const fromIra = Math.min(remainingGap, balances.ira);
      balances.ira -= fromIra;
      withdrawals.ira = fromIra;
      remainingGap -= fromIra;
    }

    if (remainingGap > 0 && age >= inputs.k401AccessAge) {
      const from401k = Math.min(remainingGap, balances.k401);
      balances.k401 -= from401k;
      withdrawals.k401 = from401k;
      remainingGap -= from401k;
    }

    withdrawals.total = withdrawals.brokerage + withdrawals.ira + withdrawals.k401;

    const row = {
      age,
      startBalances,
      income,
      baseSpending,
      childEventSpending: childEvents.total,
      eventDetails: childEvents.details,
      totalNeed,
      withdrawals,
      shortfall: remainingGap,
      endBalances: { ...balances },
      totalAssetsEnd: balances.k401 + balances.ira + balances.brokerage,
      k401Accessible: age >= inputs.k401AccessAge
    };

    rows.push(row);

    if (row.totalAssetsEnd <= 0 && remainingGap > 0) {
      break;
    }
  }

  return rows;
}

function getGuaranteedIncomeForAge(inputs, age) {
  let pension = 0;
  let social = 0;

  if (age >= inputs.primary.income.pensionStartAge) {
    pension += inputs.primary.income.pensionMonthly * 12;
  }
  if (age >= inputs.primary.income.socialStartAge) {
    social += inputs.primary.income.socialMonthly * 12;
  }

  if (inputs.householdType === "couple") {
    if (age >= inputs.spouse.income.pensionStartAge) {
      pension += inputs.spouse.income.pensionMonthly * 12;
    }
    if (age >= inputs.spouse.income.socialStartAge) {
      social += inputs.spouse.income.socialMonthly * 12;
    }
  }

  return {
    pension,
    social,
    guaranteed: pension + social
  };
}

function getChildEventsForAge(inputs, planAge) {
  if (!inputs.children.length) {
    return { total: 0, details: [] };
  }

  const details = [];
  let total = 0;

  inputs.children.forEach((child, index) => {
    const childAgeAtPlanYear = child.currentAge + (planAge - inputs.primary.currentAge);

    if (
      child.includeCollege &&
      childAgeAtPlanYear >= COLLEGE_START_AGE &&
      childAgeAtPlanYear < COLLEGE_START_AGE + COLLEGE_YEARS
    ) {
      const annualCollege = (child.collegeTotalCost / COLLEGE_YEARS) * (child.parentPayPct / 100);
      total += annualCollege;
      details.push(`Child ${index + 1} college`);
    }

    if (child.includeWedding && childAgeAtPlanYear === WEDDING_SUPPORT_AGE) {
      total += child.weddingAmount;
      details.push(`Child ${index + 1} wedding`);
    }
  });

  return { total, details };
}

function buildSummary(rows, inputs) {
  const totalAssetsToday =
    inputs.primary.accounts.k401.balance +
    inputs.primary.accounts.ira.balance +
    inputs.primary.accounts.brokerage.balance +
    inputs.spouse.accounts.k401.balance +
    inputs.spouse.accounts.ira.balance +
    inputs.spouse.accounts.brokerage.balance;

  const retirementRow = rows.find(row => row.age === inputs.primary.retirementAge) || rows[rows.length - 1];
  const lastRow = rows[rows.length - 1];
  const firstShortfallRow = rows.find(row => row.shortfall > 0);
  const depletionRow = rows.find(row => row.totalAssetsEnd <= 0);

  const guaranteedIncomeAtRetirement = retirementRow ? retirementRow.income.guaranteed : 0;

  const totalProjectedCollegeSupport = projectTotalCollegeSupport(inputs);
  const totalProjectedWeddingSupport = projectTotalWeddingSupport(inputs);
  const firstPostRetirementChildEventAge = getFirstPostRetirementChildEventAge(inputs);

  return {
    totalAssetsToday,
    portfolioAtRetirement: retirementRow ? retirementRow.totalAssetsEnd : totalAssetsToday,
    assetsRemainingAtEnd: lastRow ? lastRow.totalAssetsEnd : totalAssetsToday,
    annualRetirementSpendingGoal: inputs.annualSpendingGoal,
    guaranteedIncomeAtRetirement,
    firstShortfallAge: firstShortfallRow ? firstShortfallRow.age : "None",
    depletionAge: depletionRow ? depletionRow.age : "None",
    totalProjectedCollegeSupport,
    totalProjectedWeddingSupport,
    firstPostRetirementChildEventAge,
    status: getPlanStatus(lastRow, firstShortfallRow, depletionRow)
  };
}

function projectTotalCollegeSupport(inputs) {
  return inputs.children.reduce((sum, child) => {
    if (!child.includeCollege) return sum;
    return sum + child.collegeTotalCost * (child.parentPayPct / 100);
  }, 0);
}

function projectTotalWeddingSupport(inputs) {
  return inputs.children.reduce((sum, child) => {
    if (!child.includeWedding) return sum;
    return sum + child.weddingAmount;
  }, 0);
}

function getFirstPostRetirementChildEventAge(inputs) {
  const ages = [];

  inputs.children.forEach(child => {
    const collegeStartPlanAge = inputs.primary.currentAge + (COLLEGE_START_AGE - child.currentAge);
    const weddingPlanAge = inputs.primary.currentAge + (WEDDING_SUPPORT_AGE - child.currentAge);

    if (child.includeCollege && collegeStartPlanAge >= inputs.primary.retirementAge) {
      ages.push(collegeStartPlanAge);
    }
    if (child.includeWedding && weddingPlanAge >= inputs.primary.retirementAge) {
      ages.push(weddingPlanAge);
    }
  });

  if (ages.length === 0) return "None";
  return Math.min(...ages);
}

function getPlanStatus(lastRow, firstShortfallRow, depletionRow) {
  if (depletionRow) {
    return { text: "Warning: Assets depleted before end age", className: "status-bad" };
  }
  if (firstShortfallRow) {
    return { text: "Warning: Spending goal not fully met in some years", className: "status-warning" };
  }
  if (lastRow && lastRow.totalAssetsEnd > 0) {
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
    { label: "Annual Spending Goal", value: formatCurrency(summary.annualRetirementSpendingGoal) },
    { label: "Guaranteed Income at Retirement", value: formatCurrency(summary.guaranteedIncomeAtRetirement) },
    { label: "Projected College Support", value: formatCurrency(summary.totalProjectedCollegeSupport) },
    { label: "Projected Wedding Support", value: formatCurrency(summary.totalProjectedWeddingSupport) },
    { label: "First Post-Retirement Child Event", value: summary.firstPostRetirementChildEventAge },
    { label: "First Shortfall Age", value: summary.firstShortfallAge },
    { label: "Depletion Age", value: summary.depletionAge },
    { label: "Plan Status", value: summary.status.text, className: summary.status.className }
  ];

  container.innerHTML = cards.map(card => `
    <div class="summary-card ${card.className || ""}">
      <div class="label">${escapeHtml(card.label)}</div>
      <div class="value">${escapeHtml(String(card.value))}</div>
    </div>
  `).join("");
}

function renderCharts(rows) {
  const ages = rows.map(row => row.age);
  const totalPortfolio = rows.map(row => roundMoney(row.totalAssetsEnd));
  const k401Data = rows.map(row => roundMoney(row.endBalances.k401));
  const iraData = rows.map(row => roundMoney(row.endBalances.ira));
  const brokerageData = rows.map(row => roundMoney(row.endBalances.brokerage));
  const guaranteedIncome = rows.map(row => roundMoney(row.income.guaranteed));
  const withdrawals = rows.map(row => roundMoney(row.withdrawals.total));
  const spendingNeed = rows.map(row => roundMoney(row.totalNeed));

  if (portfolioChartInstance) portfolioChartInstance.destroy();
  if (balancesChartInstance) balancesChartInstance.destroy();
  if (incomeChartInstance) incomeChartInstance.destroy();

  portfolioChartInstance = new Chart(document.getElementById("portfolioChart"), {
    type: "line",
    data: {
      labels: ages,
      datasets: [
        { label: "Total Portfolio", data: totalPortfolio, tension: 0.25 }
      ]
    },
    options: getCurrencyChartOptions("Portfolio Value ($)")
  });

  balancesChartInstance = new Chart(document.getElementById("balancesChart"), {
    type: "line",
    data: {
      labels: ages,
      datasets: [
        { label: "401(k)", data: k401Data, tension: 0.25 },
        { label: "IRA", data: iraData, tension: 0.25 },
        { label: "Brokerage", data: brokerageData, tension: 0.25 }
      ]
    },
    options: getCurrencyChartOptions("Account Balance ($)")
  });

  incomeChartInstance = new Chart(document.getElementById("incomeChart"), {
    type: "line",
    data: {
      labels: ages,
      datasets: [
        { label: "Guaranteed Income", data: guaranteedIncome, tension: 0.25 },
        { label: "Withdrawals", data: withdrawals, tension: 0.25 },
        { label: "Spending Need", data: spendingNeed, tension: 0.25 }
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

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.age}</td>
      <td>${formatCurrency(row.startBalances.k401)}</td>
      <td>${formatCurrency(row.startBalances.ira)}</td>
      <td>${formatCurrency(row.startBalances.brokerage)}</td>
      <td>${formatCurrency(row.income.pension)}</td>
      <td>${formatCurrency(row.income.social)}</td>
      <td>${formatCurrency(row.income.guaranteed)}</td>
      <td>${formatCurrency(row.baseSpending)}</td>
      <td>${formatCurrency(row.childEventSpending)}</td>
      <td>${formatCurrency(row.totalNeed)}</td>
      <td>${formatCurrency(row.withdrawals.brokerage)}</td>
      <td>${formatCurrency(row.withdrawals.ira)}</td>
      <td>${formatCurrency(row.withdrawals.k401)}</td>
      <td>${formatCurrency(row.withdrawals.total)}</td>
      <td>${formatCurrency(row.shortfall)}</td>
      <td>${formatCurrency(row.endBalances.k401)}</td>
      <td>${formatCurrency(row.endBalances.ira)}</td>
      <td>${formatCurrency(row.endBalances.brokerage)}</td>
      <td>${formatCurrency(row.totalAssetsEnd)}</td>
      <td class="event-detail-cell">${escapeHtml(row.eventDetails.join(", ") || "-")}</td>
    </tr>
  `).join("");
}

function findRecommendedAge() {
  hideOptimizationErrors();
  clearOptimizationOutput();
  saveInputsToStorage();

  const baseInputs = getInputs();
  const baseErrors = validateInputs(baseInputs);
  if (baseErrors.length > 0) {
    showOptimizationErrors(["Please fix the main input errors before running optimization."]);
    return;
  }

  const opt = baseInputs.optimization;
  const optErrors = validateOptimizationInputs(opt, baseInputs);
  if (optErrors.length > 0) {
    showOptimizationErrors(optErrors);
    return;
  }

  const isCouple = baseInputs.householdType === "couple";
  const candidates = buildOptimizationCandidates(baseInputs, opt, isCouple);

  if (!candidates.length) {
    showOptimizationErrors(["No optimization candidates were generated."]);
    return;
  }

  const result = chooseRecommendedCandidate(candidates, baseInputs, opt.method, opt.scope, isCouple);

  if (!result || !result.candidate) {
    showOptimizationErrors(["Could not determine a recommended result from the selected range."]);
    return;
  }

  lastOptimizationResult = {
    recommendedPrimaryAge: result.candidate.primaryRetirementAge,
    recommendedSpouseAge: result.candidate.spouseRetirementAge,
    method: opt.method,
    scope: opt.scope,
    isCouple,
    matchType: result.matchType,
    explanation: result.explanation,
    candidate: result.candidate
  };

  renderOptimizationResult(result, opt.scope, isCouple);
}

function buildOptimizationCandidates(baseInputs, opt, isCouple) {
  const candidates = [];

  let primaryRange = [];
  let spouseRange = [];

  if (opt.scope === "primary") {
    primaryRange = rangeInclusive(opt.primaryStartAge, opt.primaryEndAge);
    spouseRange = [isCouple ? baseInputs.spouse.retirementAge : 0];
  } else {
    primaryRange = rangeInclusive(opt.primaryStartAge, opt.primaryEndAge);
    spouseRange = rangeInclusive(opt.spouseStartAge, opt.spouseEndAge);
  }

  for (const primaryRetirementAge of primaryRange) {
    for (const spouseRetirementAge of spouseRange) {
      const testInputs = JSON.parse(JSON.stringify(baseInputs));
      testInputs.primary.retirementAge = primaryRetirementAge;

      if (isCouple) {
        testInputs.spouse.retirementAge = spouseRetirementAge;
      }

      const rows = simulatePlan(testInputs);
      const summary = buildSummary(rows, testInputs);
      const metrics = buildCandidateMetrics(rows, testInputs);

      candidates.push({
        primaryRetirementAge,
        spouseRetirementAge: isCouple ? spouseRetirementAge : 0,
        rows,
        summary,
        ...metrics
      });
    }
  }

  return candidates;
}

function buildCandidateMetrics(rows, testInputs) {
  const lastRow = rows[rows.length - 1];
  const totalShortfall = rows.reduce((sum, row) => sum + row.shortfall, 0);
  const yearsWithShortfall = rows.filter(row => row.shortfall > 0).length;
  const firstShortfallRow = rows.find(row => row.shortfall > 0);
  const depletionRow = rows.find(row => row.totalAssetsEnd <= 0);

  const feasible = !firstShortfallRow && !depletionRow;
  const successful = feasible;
  const depletionOccurred = !!depletionRow;
  const depletionAgeNumeric = depletionRow ? depletionRow.age : Infinity;
  const firstShortfallAge = firstShortfallRow ? firstShortfallRow.age : "None";
  const depletionAge = depletionRow ? depletionRow.age : "None";
  const endAssets = lastRow ? lastRow.totalAssetsEnd : 0;
  const meetsSafetyMargin = feasible && endAssets >= testInputs.optimization.safetyMargin;

  return {
    feasible,
    successful,
    depletionOccurred,
    depletionAgeNumeric,
    firstShortfallAge,
    depletionAge,
    totalShortfall,
    yearsWithShortfall,
    endAssets,
    meetsSafetyMargin
  };
}

function buildForcedNoRetirementCandidate(baseInputs, scope, isCouple) {
  const forcedInputs = JSON.parse(JSON.stringify(baseInputs));

  forcedInputs.primary.retirementAge = MAX_RETIREMENT_AGE;

  if (scope === "both" && isCouple) {
    forcedInputs.spouse.retirementAge = MAX_RETIREMENT_AGE;
  }

  const rows = simulatePlan(forcedInputs);
  const summary = buildSummary(rows, forcedInputs);
  const metrics = buildCandidateMetrics(rows, forcedInputs);

  return {
    primaryRetirementAge: forcedInputs.primary.retirementAge,
    spouseRetirementAge: isCouple ? forcedInputs.spouse.retirementAge : 0,
    rows,
    summary,
    ...metrics
  };
}

function chooseRecommendedCandidate(candidates, baseInputs, method, scope, isCouple) {
  if (!candidates.length) return null;

  const feasibleCandidates = candidates.filter(c => c.feasible);
  const safetyCandidates = candidates.filter(c => c.meetsSafetyMargin);

  if (method === "earliest_feasible") {
    if (feasibleCandidates.length) {
      return {
        candidate: sortEarliest(feasibleCandidates, isCouple)[0],
        matchType: "feasible",
        explanation: "Fully successful. No shortfall and no asset depletion in the selected range."
      };
    }

    const forced = buildForcedNoRetirementCandidate(baseInputs, scope, isCouple);
    return {
      candidate: forced,
      matchType: "forced_no_retirement",
      explanation: buildForcedNoRetirementExplanation(
        scope,
        "No fully successful result was found in the selected range. Fallback recommendation: do not retire in the model."
      )
    };
  }

  if (method === "max_end_assets") {
    if (feasibleCandidates.length) {
      return {
        candidate: [...feasibleCandidates].sort((a, b) => b.endAssets - a.endAssets)[0],
        matchType: "feasible_max_assets",
        explanation: "Fully successful. Showing the successful result with the highest ending assets."
      };
    }

    const forced = buildForcedNoRetirementCandidate(baseInputs, scope, isCouple);
    return {
      candidate: forced,
      matchType: "forced_no_retirement",
      explanation: buildForcedNoRetirementExplanation(
        scope,
        "No successful result exists in the selected range, so maximum end assets could not be chosen from successful cases. Fallback recommendation: do not retire in the model."
      )
    };
  }

  if (method === "safety_margin") {
    if (safetyCandidates.length) {
      return {
        candidate: sortEarliest(safetyCandidates, isCouple)[0],
        matchType: "safety_margin",
        explanation: "Fully successful. Meets the safety margin with no shortfall and no depletion."
      };
    }

    if (feasibleCandidates.length) {
      return {
        candidate: sortEarliest(feasibleCandidates, isCouple)[0],
        matchType: "feasible_no_margin",
        explanation: "No result met the safety margin. Showing the earliest fully successful result instead."
      };
    }

    const forced = buildForcedNoRetirementCandidate(baseInputs, scope, isCouple);
    return {
      candidate: forced,
      matchType: "forced_no_retirement",
      explanation: buildForcedNoRetirementExplanation(
        scope,
        "No fully successful result was found, and none met the safety margin. Fallback recommendation: do not retire in the model."
      )
    };
  }

  return null;
}

function sortEarliest(candidates, isCouple) {
  const clone = [...candidates];
  if (isCouple) {
    return clone.sort(compareEarliestCandidate);
  }
  return clone.sort((a, b) => a.primaryRetirementAge - b.primaryRetirementAge);
}

function compareEarliestCandidate(a, b) {
  const aMax = Math.max(a.primaryRetirementAge, a.spouseRetirementAge);
  const bMax = Math.max(b.primaryRetirementAge, b.spouseRetirementAge);

  if (aMax !== bMax) return aMax - bMax;

  const aSum = a.primaryRetirementAge + a.spouseRetirementAge;
  const bSum = b.primaryRetirementAge + b.spouseRetirementAge;

  if (aSum !== bSum) return aSum - bSum;

  if (a.primaryRetirementAge !== b.primaryRetirementAge) {
    return a.primaryRetirementAge - b.primaryRetirementAge;
  }

  return a.spouseRetirementAge - b.spouseRetirementAge;
}

function buildForcedNoRetirementExplanation(scope, endingText) {
  if (scope === "primary") {
    return `No fully successful primary retirement age was found in the selected range while keeping the spouse retirement age fixed. ${endingText}`;
  }
  return `No fully successful primary/spouse retirement age pair was found in the selected ranges. ${endingText}`;
}

function applyRecommendedAge() {
  if (!lastOptimizationResult) {
    showOptimizationErrors(["Run optimization first before applying a recommended result."]);
    return;
  }

  const scope = lastOptimizationResult.scope;

  if (scope === "primary") {
    document.getElementById("primaryRetirementAge").value = lastOptimizationResult.recommendedPrimaryAge;
  } else if (scope === "both") {
    document.getElementById("primaryRetirementAge").value = lastOptimizationResult.recommendedPrimaryAge;
    if (lastOptimizationResult.isCouple) {
      document.getElementById("spouseRetirementAge").value = lastOptimizationResult.recommendedSpouseAge;
    }
  }

  runSimulation();
}

function renderOptimizationResult(result, scope, isCouple) {
  const candidate = result.candidate;
  const container = document.getElementById("optimizationResult");
  const methodLabel = getMethodLabel(getValue("optimizationMethod"));
  const scopeLabel = getScopeLabel(scope);
  const matchTypeLabel = getMatchTypeLabel(result.matchType);

  container.innerHTML = `
    <h3>Optimization Result</h3>
    <div class="optimization-result-grid">
      <div class="optimization-metric">
        <div class="label">Optimization Scope</div>
        <div class="value">${escapeHtml(scopeLabel)}</div>
      </div>
      <div class="optimization-metric">
        <div class="label">Recommendation Method</div>
        <div class="value">${escapeHtml(methodLabel)}</div>
      </div>
      <div class="optimization-metric">
        <div class="label">Result Type</div>
        <div class="value">${escapeHtml(matchTypeLabel)}</div>
      </div>
      <div class="optimization-metric">
        <div class="label">Recommended Primary Retirement Age</div>
        <div class="value">${escapeHtml(String(candidate.primaryRetirementAge))}</div>
      </div>
      ${
        isCouple
          ? `
          <div class="optimization-metric">
            <div class="label">Recommended Spouse Retirement Age</div>
            <div class="value">${escapeHtml(String(candidate.spouseRetirementAge))}</div>
          </div>
          `
          : ""
      }
      <div class="optimization-metric">
        <div class="label">Assets Remaining at End Age</div>
        <div class="value">${escapeHtml(formatCurrency(candidate.endAssets))}</div>
      </div>
      <div class="optimization-metric">
        <div class="label">First Shortfall Age</div>
        <div class="value">${escapeHtml(String(candidate.firstShortfallAge))}</div>
      </div>
      <div class="optimization-metric">
        <div class="label">Depletion Age</div>
        <div class="value">${escapeHtml(String(candidate.depletionAge))}</div>
      </div>
      <div class="optimization-metric">
        <div class="label">Total Shortfall</div>
        <div class="value">${escapeHtml(formatCurrency(candidate.totalShortfall))}</div>
      </div>
      <div class="optimization-metric">
        <div class="label">Years With Shortfall</div>
        <div class="value">${escapeHtml(String(candidate.yearsWithShortfall))}</div>
      </div>
      <div class="optimization-metric">
        <div class="label">Successful</div>
        <div class="value">${candidate.successful ? "Yes" : "No"}</div>
      </div>
      <div class="optimization-metric">
        <div class="label">Safety Margin Met</div>
        <div class="value">${candidate.meetsSafetyMargin ? "Yes" : "No"}</div>
      </div>
    </div>

    <div class="withdrawal-note" style="margin-top: 14px;">
      <p><strong>Interpretation:</strong> ${escapeHtml(result.explanation)}</p>
    </div>
  `;

  container.classList.remove("hidden");
}

function getMethodLabel(method) {
  const labels = {
    earliest_feasible: "Earliest feasible",
    max_end_assets: "Maximum end assets",
    safety_margin: "Recommended with safety margin"
  };
  return labels[method] || method;
}

function getScopeLabel(scope) {
  const labels = {
    primary: "Primary only",
    both: "Both primary and spouse"
  };
  return labels[scope] || scope;
}

function getMatchTypeLabel(matchType) {
  const labels = {
    feasible: "Fully successful",
    feasible_max_assets: "Fully successful",
    safety_margin: "Fully successful with safety margin",
    feasible_no_margin: "Fully successful, but safety margin not met",
    forced_no_retirement: "Fallback — do not retire"
  };
  return labels[matchType] || matchType;
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

function clearOptimizationOutput() {
  lastOptimizationResult = null;
  const resultContainer = document.getElementById("optimizationResult");
  resultContainer.innerHTML = "";
  resultContainer.classList.add("hidden");
  hideOptimizationErrors();
}

function showOptimizationErrors(errors) {
  const box = document.getElementById("optimizationErrorBox");
  box.innerHTML = errors.map(err => `<div>• ${escapeHtml(err)}</div>`).join("");
  box.classList.remove("hidden");
}

function hideOptimizationErrors() {
  const box = document.getElementById("optimizationErrorBox");
  box.innerHTML = "";
  box.classList.add("hidden");
}

function rangeInclusive(start, end) {
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
}

function getValue(id) {
  return document.getElementById(id).value;
}

function getNumber(id) {
  const value = document.getElementById(id).value;
  if (value === "" || value === null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatCurrency(value) {
  const rounded = roundMoney(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(rounded);
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
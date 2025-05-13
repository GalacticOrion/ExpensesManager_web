// Data storage
let friends = [];
let expenses = [];
let editingFriendId = null;
let darkMode = localStorage.getItem('darkMode') === 'true';

// DOM Elements - Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// DOM Elements - Friends
const friendNameInput = document.getElementById('friendName');
const friendsList = document.getElementById('friendsList');
const friendModal = document.getElementById('friendModal');
const addFriendModalBtn = document.getElementById('addFriendModalBtn');
const saveFriendBtn = document.getElementById('saveFriendBtn');
const cancelFriendBtn = document.getElementById('cancelFriendBtn');
const friendModalTitle = document.getElementById('friendModalTitle');
const closeModalBtn = document.querySelector('.close');

// DOM Elements - Expenses
const expenseDateInput = document.getElementById('expenseDate');
const expenseDescriptionInput = document.getElementById('expenseDescription');
const expenseCategoryInput = document.getElementById('expenseCategory');
const expenseAmountInput = document.getElementById('expenseAmount');
const expensePayerSelect = document.getElementById('expensePayer');
const participantsList = document.getElementById('participantsList');
const addExpenseBtn = document.getElementById('addExpenseBtn');
const resetFormBtn = document.getElementById('resetFormBtn');
const expensesBody = document.getElementById('expensesBody');
const recentExpensesBody = document.getElementById('recentExpensesBody');
const viewAllExpensesBtn = document.getElementById('viewAllExpensesBtn');

// DOM Elements - Balances and Settlements
const balancesSummary = document.getElementById('balancesSummary');
const settlementSummary = document.getElementById('settlementSummary');

// DOM Elements - Theme Toggle
const themeToggleBtn = document.getElementById('themeToggleBtn');

// Chart objects
let expensesByCategoryChart = null;
let expensesByFriendChart = null;

// Set today's date as default
expenseDateInput.valueAsDate = new Date();

// Toggle dark/light mode
function toggleTheme() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    document.body.classList.toggle('dark-mode', darkMode);
    updateThemeButton();
    
    // Update charts if they exist
    if (expensesByCategoryChart && expensesByFriendChart) {
        updateChartTheme();
        updateCharts();
    }
}

// Update theme button icon and text
function updateThemeButton() {
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = darkMode 
            ? '<i class="fas fa-sun"></i> Light Mode' 
            : '<i class="fas fa-moon"></i> Dark Mode';
    }
}

// Apply current theme
function applyTheme() {
    document.body.classList.toggle('dark-mode', darkMode);
    updateThemeButton();
}

// Update chart theme
function updateChartTheme() {
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = darkMode ? '#e0e0e0' : '#666';
    
    Chart.defaults.color = textColor;
    
    if (expensesByCategoryChart) {
        expensesByCategoryChart.options.plugins.legend.labels.color = textColor;
        expensesByCategoryChart.update();
    }
    
    if (expensesByFriendChart) {
        expensesByFriendChart.options.plugins.legend.labels.color = textColor;
        expensesByFriendChart.update();
    }
}

// Initialize tabs
function initTabs() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to current button and content
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // If switching to dashboard, refresh charts
            if (tabId === 'dashboard') {
                // Ensure charts are updated after tab is visible
                setTimeout(() => {
                    if (!expensesByCategoryChart || !expensesByFriendChart) {
                        initializeCharts();
                    } else {
                        updateCharts();
                    }
                }, 100);
            }
        });
    });
}

// Modal Functions
function openFriendModal() {
    friendModalTitle.textContent = editingFriendId ? 'Edit Friend' : 'Add Friend';
    friendModal.style.display = 'block';
}

function closeFriendModal() {
    friendModal.style.display = 'none';
    friendNameInput.value = '';
    editingFriendId = null;
}

// Load data from localStorage if available
function loadData() {
    const savedFriends = localStorage.getItem('friendsData');
    const savedExpenses = localStorage.getItem('expensesData');
    
    if (savedFriends) {
        friends = JSON.parse(savedFriends);
        renderFriendsList();
    }
    
    if (savedExpenses) {
        expenses = JSON.parse(savedExpenses);
        renderExpensesTable();
        renderRecentExpenses();
    }
    
    updatePayerAndParticipants();
    updateBalances();
    updateSettlements();
    
    // Make sure the Dashboard tab content is fully visible before initializing charts
    setTimeout(() => {
        // Make sure we're on the Dashboard tab first
        if (!document.getElementById('dashboard').classList.contains('active')) {
            document.querySelector('.tab-btn[data-tab="dashboard"]').click();
        }
        
        // Initialize charts after a short delay to ensure container sizes are correct
        setTimeout(() => {
            initializeCharts();
        }, 300);
    }, 100);
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('friendsData', JSON.stringify(friends));
    localStorage.setItem('expensesData', JSON.stringify(expenses));
}

// Generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Add or update a friend
function handleSaveFriend() {
    const name = friendNameInput.value.trim();
    
    if (!name) {
        alert('Please enter a friend name');
        return;
    }
    
    if (editingFriendId) {
        // Update existing friend
        const index = friends.findIndex(friend => friend.id === editingFriendId);
        if (index !== -1) {
            friends[index].name = name;
            editingFriendId = null;
        }
    } else {
        // Add new friend
        const newFriend = {
            id: generateId(),
            name: name
        };
        
        friends.push(newFriend);
    }
    
    saveData();
    renderFriendsList();
    updatePayerAndParticipants();
    updateCharts();
    closeFriendModal();
}

// Delete a friend
function handleDeleteFriend(id) {
    // Check if friend is in any expense
    const usedInExpense = expenses.some(expense => 
        expense.payer === id || expense.participants.includes(id)
    );
    
    if (usedInExpense) {
        alert('Cannot delete this friend as they are involved in expenses.');
        return;
    }
    
    friends = friends.filter(friend => friend.id !== id);
    saveData();
    renderFriendsList();
    updatePayerAndParticipants();
    updateCharts();
}

// Edit a friend
function handleEditFriend(id) {
    const friend = friends.find(friend => friend.id === id);
    if (friend) {
        friendNameInput.value = friend.name;
        editingFriendId = id;
        openFriendModal();
    }
}

// Render friends list
function renderFriendsList() {
    friendsList.innerHTML = '';
    
    if (friends.length === 0) {
        friendsList.innerHTML = '<p class="empty-state">No friends added yet. Add friends to start tracking expenses.</p>';
        return;
    }
    
    friends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.innerHTML = `
            <span class="friend-name">${friend.name}</span>
            <button class="edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
        `;
        
        friendItem.querySelector('.edit-btn').addEventListener('click', () => {
            handleEditFriend(friend.id);
        });
        
        friendItem.querySelector('.delete-btn').addEventListener('click', () => {
            handleDeleteFriend(friend.id);
        });
        
        friendsList.appendChild(friendItem);
    });
}

// Update payer select and participants checkboxes
function updatePayerAndParticipants() {
    // Update payer select
    expensePayerSelect.innerHTML = '<option value="">Select who paid</option>';
    
    friends.forEach(friend => {
        const option = document.createElement('option');
        option.value = friend.id;
        option.textContent = friend.name;
        expensePayerSelect.appendChild(option);
    });
    
    // Update participants checkboxes
    participantsList.innerHTML = '';
    
    if (friends.length === 0) {
        participantsList.innerHTML = '<p class="empty-state">Add friends first to select participants.</p>';
        return;
    }
    
    friends.forEach(friend => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'participant-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `participant-${friend.id}`;
        checkbox.value = friend.id;
        
        const label = document.createElement('label');
        label.htmlFor = `participant-${friend.id}`;
        label.textContent = friend.name;
        
        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        participantsList.appendChild(checkboxDiv);
    });
}

// Reset expense form
function resetExpenseForm() {
    expenseDateInput.valueAsDate = new Date();
    expenseDescriptionInput.value = '';
    expenseCategoryInput.value = '';
    expenseAmountInput.value = '';
    expensePayerSelect.value = '';
    
    // Uncheck all participants
    document.querySelectorAll('#participantsList input[type="checkbox"]').forEach(
        checkbox => checkbox.checked = false
    );
}

// Add expense
function handleAddExpense() {
    const date = expenseDateInput.value;
    const description = expenseDescriptionInput.value.trim();
    const category = expenseCategoryInput.value;
    const amount = parseFloat(expenseAmountInput.value);
    const payer = expensePayerSelect.value;
    
    // Get selected participants
    const participants = Array.from(
        document.querySelectorAll('#participantsList input[type="checkbox"]:checked')
    ).map(checkbox => checkbox.value);
    
    if (!date || !description || !category || isNaN(amount) || amount <= 0 || !payer || participants.length === 0) {
        alert('Please fill all fields and select at least one participant');
        return;
    }
    
    // Check if payer is among participants
    if (!participants.includes(payer)) {
        alert('The payer must also be a participant');
        return;
    }
    
    const newExpense = {
        id: generateId(),
        date,
        description,
        category,
        amount,
        payer,
        participants,
        timestamp: new Date().getTime()
    };
    
    expenses.push(newExpense);
    saveData();
    renderExpensesTable();
    renderRecentExpenses();
    updateBalances();
    updateSettlements();
    updateCharts();
    
    // Switch to dashboard tab if adding was successful
    tabButtons[0].click();
    
    // Reset form
    resetExpenseForm();
}

// Edit expense
function handleEditExpense(id) {
    const expense = expenses.find(expense => expense.id === id);
    if (!expense) return;
    
    // Switch to expense tab
    tabButtons[1].click();
    
    expenseDateInput.value = expense.date;
    expenseDescriptionInput.value = expense.description;
    expenseCategoryInput.value = expense.category || 'Other';
    expenseAmountInput.value = expense.amount;
    expensePayerSelect.value = expense.payer;
    
    // Check appropriate participants
    document.querySelectorAll('#participantsList input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = expense.participants.includes(checkbox.value);
    });
    
    // Remove the expense
    expenses = expenses.filter(exp => exp.id !== id);
    
    // Update UI
    renderExpensesTable();
    renderRecentExpenses();
    updateBalances();
    updateSettlements();
    updateCharts();
    saveData();
}

// Delete expense
function handleDeleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        expenses = expenses.filter(expense => expense.id !== id);
        saveData();
        renderExpensesTable();
        renderRecentExpenses();
        updateBalances();
        updateSettlements();
        updateCharts();
    }
}

// Render expenses table
function renderExpensesTable() {
    expensesBody.innerHTML = '';
    
    if (expenses.length === 0) {
        expensesBody.innerHTML = '<tr><td colspan="7" class="empty-state">No expenses added yet.</td></tr>';
        return;
    }
    
    // Sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedExpenses.forEach(expense => {
        const row = document.createElement('tr');
        
        // Format date for display
        const formattedDate = new Date(expense.date).toLocaleDateString();
        
        // Get payer name
        const payer = friends.find(friend => friend.id === expense.payer);
        const payerName = payer ? payer.name : 'Unknown';
        
        // Get participant names
        const participantNames = expense.participants.map(id => {
            const friend = friends.find(friend => friend.id === id);
            return friend ? friend.name : 'Unknown';
        }).join(', ');
        
        row.innerHTML = `
            <td data-label="Date">${formattedDate}</td>
            <td data-label="Description">${expense.description}</td>
            <td data-label="Category">${expense.category || 'Other'}</td>
            <td data-label="Amount">$${expense.amount.toFixed(2)}</td>
            <td data-label="Payer">${payerName}</td>
            <td data-label="Participants">${participantNames}</td>
            <td data-label="Actions">
                <button class="edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        
        row.querySelector('.edit-btn').addEventListener('click', () => {
            handleEditExpense(expense.id);
        });
        
        row.querySelector('.delete-btn').addEventListener('click', () => {
            handleDeleteExpense(expense.id);
        });
        
        expensesBody.appendChild(row);
    });
}

// Render recent expenses (max 5)
function renderRecentExpenses() {
    recentExpensesBody.innerHTML = '';
    
    if (expenses.length === 0) {
        recentExpensesBody.innerHTML = '<tr><td colspan="4" class="empty-state">No expenses added yet.</td></tr>';
        return;
    }
    
    // Sort expenses by timestamp (newest first) and take top 5
    const recentExpenses = [...expenses]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 5);
    
    recentExpenses.forEach(expense => {
        const row = document.createElement('tr');
        
        // Format date for display
        const formattedDate = new Date(expense.date).toLocaleDateString();
        
        // Get payer name
        const payer = friends.find(friend => friend.id === expense.payer);
        const payerName = payer ? payer.name : 'Unknown';
        
        row.innerHTML = `
            <td data-label="Date">${formattedDate}</td>
            <td data-label="Description">${expense.description}</td>
            <td data-label="Amount">$${expense.amount.toFixed(2)}</td>
            <td data-label="Payer">${payerName}</td>
        `;
        
        recentExpensesBody.appendChild(row);
    });
}

// Calculate and update balances
function updateBalances() {
    const balances = {};
    
    // Initialize balances for all friends
    friends.forEach(friend => {
        balances[friend.id] = 0;
    });
    
    // Calculate balances based on expenses
    expenses.forEach(expense => {
        const payer = expense.payer;
        const participants = expense.participants;
        const amount = expense.amount;
        const sharePerPerson = amount / participants.length;
        
        // Add the amount the payer paid
        balances[payer] += amount;
        
        // Subtract each participant's share
        participants.forEach(participantId => {
            balances[participantId] -= sharePerPerson;
        });
    });
    
    // Display balances
    balancesSummary.innerHTML = '';
    
    if (Object.keys(balances).length === 0) {
        balancesSummary.innerHTML = '<p class="empty-state">Add friends and expenses to see balances.</p>';
        return;
    }
    
    Object.entries(balances).forEach(([friendId, balance]) => {
        const friend = friends.find(friend => friend.id === friendId);
        if (!friend) return;
        
        const balanceItem = document.createElement('div');
        balanceItem.className = `balance-item ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : ''}`;
        
        const icon = balance > 0 ? 'fa-arrow-down' : balance < 0 ? 'fa-arrow-up' : 'fa-equals';
        const status = balance > 0 ? 'gets back' : balance < 0 ? 'owes' : 'is settled';
        
        balanceItem.innerHTML = `
            <i class="fas ${icon} mr-2"></i>
            <span>${friend.name}: ${status} $${Math.abs(balance).toFixed(2)}</span>
        `;
        
        balancesSummary.appendChild(balanceItem);
    });
    
    return balances;
}

// Calculate and display who pays whom
function updateSettlements() {
    const balances = updateBalances();
    settlementSummary.innerHTML = '';
    
    if (Object.keys(balances).length === 0) {
        settlementSummary.innerHTML = '<p class="empty-state">Add friends and expenses to see settlement plan.</p>';
        return;
    }
    
    // Create a list of creditors (balance > 0) and debtors (balance < 0)
    const creditors = [];
    const debtors = [];
    
    for (const [friendId, balance] of Object.entries(balances)) {
        const friend = friends.find(f => f.id === friendId);
        if (!friend) continue;
        
        if (balance > 0) {
            creditors.push({ id: friendId, name: friend.name, balance: balance });
        } else if (balance < 0) {
            debtors.push({ id: friendId, name: friend.name, balance: balance });
        }
    }
    
    // Sort by absolute balance value (descending)
    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => a.balance - b.balance);
    
    // If no settlements needed
    if (creditors.length === 0 || debtors.length === 0) {
        settlementSummary.innerHTML = '<p class="empty-state">Everyone is settled up!</p>';
        return;
    }
    
    // Calculate payments
    const settlements = [];
    
    // Make copies to work with
    const creditorsRemaining = [...creditors];
    const debtorsRemaining = [...debtors];
    
    while (creditorsRemaining.length > 0 && debtorsRemaining.length > 0) {
        const creditor = creditorsRemaining[0];
        const debtor = debtorsRemaining[0];
        
        // Calculate payment amount (minimum of absolute values)
        const paymentAmount = Math.min(creditor.balance, Math.abs(debtor.balance));
        
        // Round to 2 decimal places to avoid floating point issues
        const roundedAmount = Math.round(paymentAmount * 100) / 100;
        
        if (roundedAmount > 0) {
            settlements.push({
                from: debtor.id,
                fromName: debtor.name,
                to: creditor.id,
                toName: creditor.name,
                amount: roundedAmount
            });
        }
        
        // Update balances
        creditor.balance -= roundedAmount;
        debtor.balance += roundedAmount;
        
        // Remove creditors/debtors that are settled
        if (Math.abs(creditor.balance) < 0.01) {
            creditorsRemaining.shift();
        }
        
        if (Math.abs(debtor.balance) < 0.01) {
            debtorsRemaining.shift();
        }
    }
    
    // Display settlements
    if (settlements.length === 0) {
        settlementSummary.innerHTML = '<p class="empty-state">Everyone is settled up!</p>';
        return;
    }
    
    settlements.forEach(settlement => {
        const settlementItem = document.createElement('div');
        settlementItem.className = 'settlement-item';
        
        settlementItem.innerHTML = `
            <i class="fas fa-exchange-alt mr-2"></i>
            <span><strong>${settlement.fromName}</strong> should pay <strong>${settlement.toName}</strong> $${settlement.amount.toFixed(2)}</span>
        `;
        
        settlementSummary.appendChild(settlementItem);
    });
}

// Initialize charts
function initializeCharts() {
    try {
        // Check if chart elements exist in the DOM
        const categoryCanvas = document.getElementById('expensesByCategory');
        const friendCanvas = document.getElementById('expensesByFriend');
        
        if (!categoryCanvas || !friendCanvas) {
            console.log('Chart canvases not found in DOM, will try again later');
            return;
        }
        
        // If charts already exist, destroy them first
        if (expensesByCategoryChart) {
            expensesByCategoryChart.destroy();
        }
        
        if (expensesByFriendChart) {
            expensesByFriendChart.destroy();
        }
        
        // Set chart text color based on theme
        const textColor = darkMode ? '#e0e0e0' : '#5a5c69';
        Chart.defaults.color = textColor;
        
        // Create category chart
        const categoryCtx = categoryCanvas.getContext('2d');
        expensesByCategoryChart = new Chart(categoryCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', 
                        '#e74a3b', '#858796', '#5a5c69', '#f8f9fc'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor,
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart.getDatasetMeta(0).total;
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        // Create friend chart
        const friendCtx = friendCanvas.getContext('2d');
        expensesByFriendChart = new Chart(friendCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', 
                        '#e74a3b', '#858796', '#5a5c69', '#f8f9fc'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor,
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart.getDatasetMeta(0).total;
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        // Initial update
        updateCharts();
        console.log('Charts initialized successfully');
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

// Update charts with current data
function updateCharts() {
    if (!expensesByCategoryChart || !expensesByFriendChart) {
        console.log('Charts not initialized yet, trying to initialize now');
        initializeCharts();
        return;
    }
    
    try {
        // Update expenses by category chart
        const categories = {};
        expenses.forEach(expense => {
            const category = expense.category || 'Other';
            if (!categories[category]) {
                categories[category] = 0;
            }
            categories[category] += expense.amount;
        });
        
        // Prepare data for category chart
        const categoryLabels = Object.keys(categories);
        const categoryData = Object.values(categories);
        
        expensesByCategoryChart.data.labels = categoryLabels;
        expensesByCategoryChart.data.datasets[0].data = categoryData;
        expensesByCategoryChart.update();
        
        // Update expenses by friend chart
        const friendTotals = {};
        friends.forEach(friend => {
            friendTotals[friend.id] = 0;
        });
        
        expenses.forEach(expense => {
            if (friendTotals[expense.payer] !== undefined) {
                friendTotals[expense.payer] += expense.amount;
            }
        });
        
        // Prepare data for friend chart
        const friendLabels = [];
        const friendData = [];
        
        for (const [friendId, total] of Object.entries(friendTotals)) {
            const friend = friends.find(f => f.id === friendId);
            if (friend && total > 0) {
                friendLabels.push(friend.name);
                friendData.push(total);
            }
        }
        
        expensesByFriendChart.data.labels = friendLabels;
        expensesByFriendChart.data.datasets[0].data = friendData;
        expensesByFriendChart.update();
        
        console.log('Charts updated successfully');
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

// Event Listeners
function setupEventListeners() {
    // Tab navigation
    initTabs();
    
    // Theme toggle
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Friend Modal
    addFriendModalBtn.addEventListener('click', () => {
        editingFriendId = null;
        openFriendModal();
    });
    
    saveFriendBtn.addEventListener('click', handleSaveFriend);
    
    cancelFriendBtn.addEventListener('click', closeFriendModal);
    
    closeModalBtn.addEventListener('click', closeFriendModal);
    
    window.addEventListener('click', (event) => {
        if (event.target === friendModal) {
            closeFriendModal();
        }
    });
    
    // Expenses
    addExpenseBtn.addEventListener('click', handleAddExpense);
    
    resetFormBtn.addEventListener('click', resetExpenseForm);
    
    viewAllExpensesBtn.addEventListener('click', () => {
        tabButtons[1].click();
    });
    
    // Handle window resize for charts
    window.addEventListener('resize', () => {
        if (document.getElementById('dashboard').classList.contains('active')) {
            setTimeout(updateCharts, 100);
        }
    });
}

// Initialize app and ensure charts load properly
function init() {
    applyTheme();
    setupEventListeners();
    
    // Load data first
    loadData();
    
    // Make sure charts are visible by showing dashboard tab first
    const dashboardTab = document.querySelector('.tab-btn[data-tab="dashboard"]');
    if (dashboardTab) {
        dashboardTab.click();
    }
    
    // Initialize charts with delay to ensure DOM is fully loaded
    window.addEventListener('load', function() {
        setTimeout(initializeCharts, 500);
    });
    
    // Also handle resize events to redraw charts
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (document.getElementById('dashboard').classList.contains('active')) {
                updateCharts();
            }
        }, 250);
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', init); 
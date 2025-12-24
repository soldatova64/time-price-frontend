import { ref, onMounted, reactive } from 'vue'

// Функция для получения куки по имени
function getCookie(name) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
}

// Функция для форматирования токена (первые 5 символов + ... + последние 5 символов)
function formatToken(token) {
    if (!token || token.length < 10) return token
    return `${token.substring(0, 5)}...${token.substring(token.length - 5)}`
}

// Функция для преобразования разных форматов даты в ISO формат (YYYY-MM-DD)
function normalizeDate(dateStr) {
    if (!dateStr) return ''

    // Удаляем лишние пробелы
    dateStr = dateStr.trim()

    // Пробуем разные форматы
    // 1. Формат DD.MM.YYYY
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        const parts = dateStr.split('.')
        const day = parts[0].padStart(2, '0')
        const month = parts[1].padStart(2, '0')
        const year = parts[2]
        return `${year}-${month}-${day}`
    }
    // 2. Формат DD-MM-YYYY
    else if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const parts = dateStr.split('-')
        const day = parts[0].padStart(2, '0')
        const month = parts[1].padStart(2, '0')
        const year = parts[2]
        return `${year}-${month}-${day}`
    }
    // 3. Формат DD/MM/YYYY
    else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parts = dateStr.split('/')
        const day = parts[0].padStart(2, '0')
        const month = parts[1].padStart(2, '0')
        const year = parts[2]
        return `${year}-${month}-${day}`
    }
    // 4. Формат YYYY-MM-DD (уже правильный)
    else if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const parts = dateStr.split('-')
        const year = parts[0]
        const month = parts[1].padStart(2, '0')
        const day = parts[2].padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    return dateStr
}

// Функция для форматирования даты для отображения в поле ввода
function formatDateForInput(dateString) {
    if (!dateString) return ''

    // Если дата уже в формате DD.MM.YYYY, оставляем как есть
    if (dateString.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        return dateString
    }

    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateString)
            return ''
        }

        // Преобразуем в формат DD.MM.YYYY для удобства пользователя
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()

        return `${day}.${month}.${year}`
    } catch (err) {
        console.error('Error formatting date:', err)
        return dateString
    }
}

export default {
    setup() {
        const state = reactive({
            isAuthenticated: false,
            loading: false,
            error: '',
            items: [],
            token: getCookie('auth_token') || '',
            showRegisterForm: false,
            registerSuccess: false,
            expenses: [],
            userProfile: null,
            activeTab: 'things'
        })

        // Реактивные данные для модальных окон вещей
        const showAddThingModal = ref(false)
        const showEditThingModal = ref(false)
        const addThingLoading = ref(false)
        const editThingLoading = ref(false)
        const addThingError = ref('')
        const editThingError = ref('')
        const addThingSuccess = ref(false)
        const editThingSuccess = ref(false)

        // Реактивные данные для модальных окон расходов
        const showAddExpenseModal = ref(false)
        const showEditExpenseModal = ref(false)
        const showExpensesListModal = ref(false)
        const addExpenseLoading = ref(false)
        const editExpenseLoading = ref(false)
        const addExpenseError = ref('')
        const editExpenseError = ref('')
        const addExpenseSuccess = ref(false)
        const editExpenseSuccess = ref(false)

        // Данные для редактирования профиля
        const showEditProfileModal = ref(false)
        const editProfileLoading = ref(false)
        const editProfileError = ref('')
        const editProfileSuccess = ref(false)

        // Переменные для переключения видимости пароля
        const showRegisterPassword = ref(false)
        const showLoginPassword = ref(false)
        const showEditProfilePassword = ref(false)
        const showEditProfileConfirmPassword = ref(false)

        const newExpense = reactive({
            thing_id: null,
            sum: 0,
            description: '',
            expense_date: ''
        })

        const editExpense = reactive({
            id: null,
            thing_id: null,
            sum: 0,
            description: '',
            expense_date: ''
        })

        const newThing = reactive({
            name: '',
            pay_date: '',
            pay_price: 0,
            sale_date: '',
            sale_price: 0
        })

        const editThing = reactive({
            id: null,
            name: '',
            pay_date: '',
            pay_price: 0,
            sale_date: '',
            sale_price: 0
        })

        const editProfile = reactive({
            username: '',
            password: '',
            confirmPassword: ''
        })

        // Базовый URL API
        const API_BASE = '/api'

        // ========== МЕТОДЫ ДЛЯ ВЕЩЕЙ ==========
        const openAddThingModal = () => {
            showAddThingModal.value = true
            addThingError.value = ''
            addThingSuccess.value = false

            // Получаем текущую дату в формате DD.MM.YYYY
            const today = new Date()
            const currentDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`

            Object.assign(newThing, {
                name: '',
                pay_date: currentDate, // Текущая дата в формате DD.MM.YYYY
                pay_price: 0,
                sale_date: '',
                sale_price: 0
            })
        }

        const closeAddThingModal = () => {
            showAddThingModal.value = false
        }

        const openEditThingModal = (thing) => {
            showEditThingModal.value = true
            editThingError.value = ''
            editThingSuccess.value = false
            Object.assign(editThing, {
                id: thing.id,
                name: thing.name,
                pay_date: formatDateForInput(thing.pay_date),
                pay_price: thing.pay_price,
                sale_date: thing.sale_date ? formatDateForInput(thing.sale_date) : '',
                sale_price: thing.sale_price || 0
            })
        }

        const closeEditThingModal = () => {
            showEditThingModal.value = false
        }

        const submitAddThing = async () => {
            addThingLoading.value = true
            addThingError.value = ''
            addThingSuccess.value = false

            try {
                if (!newThing.name || newThing.name.length < 3) {
                    throw new Error('Название должно содержать минимум 3 символа')
                }

                // Нормализуем дату
                const normalizedPayDate = normalizeDate(newThing.pay_date)
                if (!normalizedPayDate) {
                    throw new Error('Дата покупки обязательна')
                }

                // Проверяем, что дата корректна
                const payDateObj = new Date(normalizedPayDate + 'T00:00:00Z')
                if (isNaN(payDateObj.getTime())) {
                    throw new Error('Некорректная дата покупки. Используйте формат ДД.ММ.ГГГГ')
                }

                if (!newThing.pay_price || newThing.pay_price <= 0) {
                    throw new Error('Цена покупки должна быть больше 0')
                }

                let normalizedSaleDate = null
                if (newThing.sale_date) {
                    normalizedSaleDate = normalizeDate(newThing.sale_date)
                    if (normalizedSaleDate) {
                        const saleDateObj = new Date(normalizedSaleDate + 'T00:00:00Z')
                        if (isNaN(saleDateObj.getTime())) {
                            throw new Error('Некорректная дата продажи. Используйте формат ДД.ММ.ГГГГ')
                        }
                    }
                }

                const requestData = {
                    name: newThing.name,
                    pay_date: normalizedPayDate + 'T00:00:00Z',
                    pay_price: parseInt(newThing.pay_price),
                    sale_date: normalizedSaleDate ? normalizedSaleDate + 'T00:00:00Z' : null,
                    sale_price: newThing.sale_price ? parseInt(newThing.sale_price) : null
                }

                const response = await fetch(`${API_BASE}/admin/thing`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify(requestData)
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    if (errorData.errors && errorData.errors.length > 0) {
                        throw new Error(errorData.errors.map(err => err.message).join(', '))
                    } else {
                        throw new Error(`Ошибка при добавлении вещи: ${response.status}`)
                    }
                }

                addThingSuccess.value = true
                setTimeout(() => {
                    closeAddThingModal()
                    fetchHomeData()
                }, 1500)

            } catch (err) {
                addThingError.value = err.message || 'Ошибка при добавлении вещи'
                console.error('Ошибка добавления вещи:', err)
            } finally {
                addThingLoading.value = false
            }
        }

        const submitEditThing = async () => {
            editThingLoading.value = true
            editThingError.value = ''
            editThingSuccess.value = false

            try {
                if (!editThing.name || editThing.name.length < 3) {
                    throw new Error('Название должно содержать минимум 3 символа')
                }

                // Нормализуем дату
                const normalizedPayDate = normalizeDate(editThing.pay_date)
                if (!normalizedPayDate) {
                    throw new Error('Дата покупки обязательна')
                }

                // Проверяем, что дата корректна
                const payDateObj = new Date(normalizedPayDate + 'T00:00:00Z')
                if (isNaN(payDateObj.getTime())) {
                    throw new Error('Некорректная дата покупки. Используйте формат ДД.ММ.ГГГГ')
                }

                if (!editThing.pay_price || editThing.pay_price <= 0) {
                    throw new Error('Цена покупки должна быть больше 0')
                }

                let normalizedSaleDate = null
                if (editThing.sale_date) {
                    normalizedSaleDate = normalizeDate(editThing.sale_date)
                    if (normalizedSaleDate) {
                        const saleDateObj = new Date(normalizedSaleDate + 'T00:00:00Z')
                        if (isNaN(saleDateObj.getTime())) {
                            throw new Error('Некорректная дата продажи. Используйте формат ДД.ММ.ГГГГ')
                        }
                    }
                }

                const requestData = {
                    name: editThing.name,
                    pay_date: normalizedPayDate + 'T00:00:00Z',
                    pay_price: parseInt(editThing.pay_price),
                    sale_date: normalizedSaleDate ? normalizedSaleDate + 'T00:00:00Z' : null,
                    sale_price: editThing.sale_price ? parseInt(editThing.sale_price) : null
                }

                const response = await fetch(`${API_BASE}/admin/thing/${editThing.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify(requestData)
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    if (errorData.errors && errorData.errors.length > 0) {
                        throw new Error(errorData.errors.map(err => err.message).join(', '))
                    } else {
                        throw new Error(`Ошибка при редактировании вещи: ${response.status}`)
                    }
                }

                editThingSuccess.value = true
                setTimeout(() => {
                    closeEditThingModal()
                    fetchHomeData()
                }, 1500)

            } catch (err) {
                editThingError.value = err.message || 'Ошибка при редактировании вещи'
                console.error('Ошибка редактирования вещи:', err)
            } finally {
                editThingLoading.value = false
            }
        }

        const updateThingExpenses = async (thingId) => {
            try {
                const response = await fetch(`${API_BASE}/admin/thing/${thingId}/expenses`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${state.token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    if (state.selectedThingForExpenses && state.selectedThingForExpenses.id === thingId) {
                        state.selectedThingForExpenses.expense = data.data || []
                    }
                }
            } catch (err) {
                console.error('Ошибка обновления расходов:', err)
            }
        }

        const deleteThing = async (id) => {
            if (!confirm('Вы уверены, что хотите удалить эту вещь?')) {
                return
            }

            try {
                const response = await fetch(`${API_BASE}/admin/thing/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${state.token}`
                    }
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.errors?.[0]?.message || 'Ошибка при удалении вещи')
                }

                fetchHomeData()
            } catch (err) {
                state.error = err.message || 'Ошибка при удалении вещи'
                console.error('Ошибка удаления вещи:', err)
            }
        }

        const openAddExpenseModal = (thingId) => {
            // Закрываем окно списка расходов при открытии добавления
            if (showExpensesListModal.value) {
                showExpensesListModal.value = false
            }

            newExpense.thing_id = thingId
            newExpense.sum = 0
            newExpense.description = ''

            // Получаем текущую дату в формате DD.MM.YYYY
            const today = new Date()
            const currentDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`
            newExpense.expense_date = currentDate

            showAddExpenseModal.value = true
            addExpenseError.value = ''
            addExpenseSuccess.value = false
        }

        const closeAddExpenseModal = () => {
            showAddExpenseModal.value = false
            if (state.selectedThingForExpenses) {
                setTimeout(() => {
                    showExpensesListModal.value = true
                }, 10)
            }
        }

        const openEditExpenseModal = (expense) => {
            editExpense.id = expense.id
            editExpense.thing_id = expense.thing_id
            editExpense.sum = expense.sum
            editExpense.description = expense.description
            editExpense.expense_date = formatDateForInput(expense.expense_date)
            showEditExpenseModal.value = true
            editExpenseError.value = ''
            editExpenseSuccess.value = false

            if (showExpensesListModal.value) {
                showExpensesListModal.value = false
            }

            showEditExpenseModal.value = true
            editExpenseError.value = ''
            editExpenseSuccess.value = false
        }

        const closeEditExpenseModal = () => {
            showEditExpenseModal.value = false

            if (state.selectedThingForExpenses) {
                setTimeout(() => {
                    showExpensesListModal.value = true
                }, 10)
            }
        }

        const openExpensesListModal = (thing) => {
            state.selectedThingForExpenses = thing
            showExpensesListModal.value = true
        }

        const closeExpensesListModal = () => {
            showExpensesListModal.value = false
        }

        const submitAddExpense = async () => {
            addExpenseLoading.value = true
            addExpenseError.value = ''
            addExpenseSuccess.value = false

            try {
                if (!newExpense.thing_id) {
                    throw new Error('Не выбрана вещь')
                }
                if (!newExpense.sum || newExpense.sum <= 0) {
                    throw new Error('Сумма должна быть больше 0')
                }
                if (!newExpense.description || newExpense.description.length < 3) {
                    throw new Error('Описание должно содержать минимум 3 символа')
                }

                // Нормализуем дату
                const normalizedExpenseDate = normalizeDate(newExpense.expense_date)
                if (!normalizedExpenseDate) {
                    throw new Error('Дата расхода обязательна')
                }

                // Проверяем, что дата корректна
                const expenseDateObj = new Date(normalizedExpenseDate + 'T00:00:00Z')
                if (isNaN(expenseDateObj.getTime())) {
                    throw new Error('Некорректная дата расхода. Используйте формат ДД.ММ.ГГГГ')
                }

                const requestData = {
                    thing_id: parseInt(newExpense.thing_id),
                    sum: parseInt(newExpense.sum),
                    description: newExpense.description,
                    expense_date: normalizedExpenseDate + 'T00:00:00Z'
                }

                const response = await fetch(`${API_BASE}/admin/expense`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify(requestData)
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    if (errorData.errors && errorData.errors.length > 0) {
                        throw new Error(errorData.errors.map(err => err.message).join(', '))
                    } else {
                        throw new Error(`Ошибка при добавлении расхода: ${response.status}`)
                    }
                }

                const newExpenseData = await response.json()
                addExpenseSuccess.value = true

                if (state.selectedThingForExpenses && state.selectedThingForExpenses.id === newExpense.thing_id) {

                    if (!state.selectedThingForExpenses.expense) {
                        state.selectedThingForExpenses.expense = []
                    }
                    // Добавляем новый расход в массив расходов
                    state.selectedThingForExpenses.expense.push(newExpenseData.data || {
                        id: newExpenseData.data?.id || Date.now(),
                        thing_id: newExpense.thing_id,
                        sum: newExpense.sum,
                        description: newExpense.description,
                        expense_date: normalizedExpenseDate + 'T00:00:00Z'
                    })
                }

                await updateThingExpenses(newExpense.thing_id)

                setTimeout(() => {
                    closeAddExpenseModal()
                    fetchHomeData()
                    if (state.selectedThingForExpenses) {
                        openExpensesListModal(state.selectedThingForExpenses)
                    }
                }, 1500)

            } catch (err) {
                addExpenseError.value = err.message || 'Ошибка при добавлении расхода'
                console.error('Ошибка добавления расхода:', err)
            } finally {
                addExpenseLoading.value = false
            }
        }

        const submitEditExpense = async () => {
            editExpenseLoading.value = true
            editExpenseError.value = ''
            editExpenseSuccess.value = false

            try {
                if (!editExpense.thing_id) {
                    throw new Error('Не выбрана вещь')
                }
                if (!editExpense.sum || editExpense.sum <= 0) {
                    throw new Error('Сумма должна быть больше 0')
                }
                if (!editExpense.description || editExpense.description.length < 3) {
                    throw new Error('Описание должно содержать минимум 3 символа')
                }

                // Нормализуем дату
                const normalizedExpenseDate = normalizeDate(editExpense.expense_date)
                if (!normalizedExpenseDate) {
                    throw new Error('Дата расхода обязательна')
                }

                // Проверяем, что дата корректна
                const expenseDateObj = new Date(normalizedExpenseDate + 'T00:00:00Z')
                if (isNaN(expenseDateObj.getTime())) {
                    throw new Error('Некорректная дата расхода. Используйте формат ДД.ММ.ГГГГ')
                }

                const requestData = {
                    thing_id: parseInt(editExpense.thing_id),
                    sum: parseInt(editExpense.sum),
                    description: editExpense.description,
                    expense_date: normalizedExpenseDate + 'T00:00:00Z'
                }

                const response = await fetch(`${API_BASE}/admin/expense/${editExpense.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify(requestData)
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    if (errorData.errors && errorData.errors.length > 0) {
                        throw new Error(errorData.errors.map(err => err.message).join(', '))
                    } else {
                        throw new Error(`Ошибка при редактировании расхода: ${response.status}`)
                    }
                }

                const updatedExpenseData = await response.json()
                editExpenseSuccess.value = true

                // Немедленно обновляем данные в выбранной вещи
                if (state.selectedThingForExpenses && state.selectedThingForExpenses.expense) {
                    const expenseIndex = state.selectedThingForExpenses.expense.findIndex(
                        expense => expense.id === editExpense.id
                    )
                    if (expenseIndex !== -1) {
                        state.selectedThingForExpenses.expense[expenseIndex] = {
                            ...state.selectedThingForExpenses.expense[expenseIndex],
                            ...(updatedExpenseData.data || {
                                sum: editExpense.sum,
                                description: editExpense.description,
                                expense_date: normalizedExpenseDate + 'T00:00:00Z'
                            })
                        }
                    }
                }

                await updateThingExpenses(editExpense.thing_id)

                setTimeout(() => {
                    closeEditExpenseModal()
                    fetchHomeData()
                }, 1500)

            } catch (err) {
                editExpenseError.value = err.message || 'Ошибка при редактировании расхода'
                console.error('Ошибка редактирования расхода:', err)
            } finally {
                editExpenseLoading.value = false
            }
        }

        const deleteExpense = async (id) => {
            if (!confirm('Вы уверены, что хотите удалить этот расход?')) {
                return
            }

            try {
                const response = await fetch(`${API_BASE}/admin/expense/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${state.token}`
                    }
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.errors?.[0]?.message || 'Ошибка при удалении расхода')
                }

                // Немедленно удаляем расход из выбранной вещи
                if (state.selectedThingForExpenses && state.selectedThingForExpenses.expense) {
                    state.selectedThingForExpenses.expense = state.selectedThingForExpenses.expense.filter(
                        expense => expense.id !== id
                    )
                }

                await updateThingExpenses(state.selectedThingForExpenses.id)

                fetchHomeData()
                if (showExpensesListModal.value) {
                    // Если открыто окно со списком расходов, обновляем данные
                    const thing = state.selectedThingForExpenses
                    if (thing) {
                        state.selectedThingForExpenses = state.items.find(item => item.id === thing.id)
                    }
                }
            } catch (err) {
                state.error = err.message || 'Ошибка при удалении расхода'
                console.error('Ошибка удаления расхода:', err)
            }
        }

        // ========== МЕТОДЫ ДЛЯ ПРОФИЛЯ ==========
        const openEditProfileModal = () => {
            showEditProfileModal.value = true
            editProfileError.value = ''
            editProfileSuccess.value = false
            editProfile.username = ''
            editProfile.password = ''
            editProfile.confirmPassword = ''
        }

        const closeEditProfileModal = () => {
            showEditProfileModal.value = false
        }

        const cancelEditExpense = () => {
            closeEditExpenseModal()
        }

        const cancelAddExpense = () => {
            showAddExpenseModal.value = false
            if (state.selectedThingForExpenses) {
                setTimeout(() => {
                    showExpensesListModal.value = true
                }, 10)
            }
        }

        const submitEditProfile = async () => {
            editProfileLoading.value = true
            editProfileError.value = ''
            editProfileSuccess.value = false

            try {
                if (!editProfile.username && !editProfile.password) {
                    throw new Error('Укажите новое имя пользователя или пароль')
                }

                if (editProfile.password) {
                    if (editProfile.password.length < 8) {
                        throw new Error('Пароль должен содержать минимум 8 символов')
                    }
                    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(editProfile.password)) {
                        throw new Error('Пароль должен содержать заглавные и строчные буквы, а также цифры')
                    }
                    if (editProfile.password !== editProfile.confirmPassword) {
                        throw new Error('Пароли не совпадают')
                    }
                }

                const requestData = {}
                if (editProfile.username && editProfile.username.length >= 3) {
                    requestData.username = editProfile.username
                }
                if (editProfile.password) {
                    requestData.password = editProfile.password
                }

                // Получаем user_id из токена или контекста (в реальном приложении)
                // Здесь предполагаем, что у пользователя есть ID
                const response = await fetch(`${API_BASE}/admin/user/${state.userProfile?.id || 1}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    },
                    body: JSON.stringify(requestData)
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    if (errorData.errors && errorData.errors.length > 0) {
                        throw new Error(errorData.errors.map(err => err.message).join(', '))
                    } else {
                        throw new Error(`Ошибка при обновлении профиля: ${response.status}`)
                    }
                }

                editProfileSuccess.value = true
                setTimeout(() => {
                    closeEditProfileModal()
                    logout() // Перелогиниваемся после изменения данных
                }, 1500)

            } catch (err) {
                editProfileError.value = err.message || 'Ошибка при обновлении профиля'
                console.error('Ошибка обновления профиля:', err)
            } finally {
                editProfileLoading.value = false
            }
        }

        // ========== ОБЩИЕ МЕТОДЫ ==========
        onMounted(async () => {
            if (state.token) {
                state.isAuthenticated = true
                await fetchHomeData()
            }
        })

        const fetchHomeData = async () => {
            state.loading = true
            state.error = ''
            try {
                console.log('Fetching home data with token:', state.token)

                const response = await fetch(`${API_BASE}/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`
                    }
                })

                console.log('Home response status:', response.status)

                if (response.status === 401) {
                    logout()
                    return
                }

                if (!response.ok) {
                    throw new Error(`Ошибка загрузки данных: ${response.status}`)
                }

                const data = await response.json()
                console.log('Home data received:', data)
                state.items = data.data
                state.isAuthenticated = true
            } catch (err) {
                state.error = err.message || 'Ошибка при загрузке данных'
                console.error('Ошибка:', err)
            } finally {
                state.loading = false
            }
        }

        const login = async (username, password) => {
            state.error = ''
            state.loading = true
            try {
                console.log('Logging in with:', username)

                const response = await fetch(`${API_BASE}/auth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                })

                console.log('Auth response status:', response.status)

                if (!response.ok) {
                    const errorData = await response.json()
                    if (errorData.errors && errorData.errors.length > 0) {
                        throw new Error(errorData.errors.map(err => err.message).join(', '))
                    } else {
                        throw new Error(`Ошибка авторизации: ${response.status}`)
                    }
                }

                const data = await response.json()
                console.log('Auth data received:', data)
                state.token = data.data.token

                const expires = new Date()
                expires.setDate(expires.getDate() + 1)
                document.cookie = `auth_token=${state.token}; expires=${expires.toUTCString()}; path=/`

                state.isAuthenticated = true
                await fetchHomeData()

            } catch (err) {
                state.error = err.message || 'Неверные учетные данные'
                console.error('Ошибка авторизации:', err)
            } finally {
                state.loading = false
            }
        }

        const register = async (username, email, password) => {
            state.error = ''
            state.loading = true
            try {
                const response = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        email: email,
                        password: password
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    if (errorData.errors && errorData.errors.length > 0) {
                        throw new Error(errorData.errors.map(err => err.message).join(', '))
                    } else {
                        throw new Error(`Ошибка регистрации: ${response.status}`)
                    }
                }

                state.registerSuccess = true
                state.showRegisterForm = false
                state.error = ''

            } catch (err) {
                state.error = err.message || 'Ошибка сети или сервера'
                console.error('Ошибка регистрации:', err)
            } finally {
                state.loading = false
            }
        }

        const logout = () => {
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
            state.isAuthenticated = false
            state.token = ''
            state.items = []
            state.activeTab = 'things'
        }

        // Используем formatDateForInput, который теперь возвращает DD.MM.YYYY

        return {
            state,
            username: ref(''),
            password: ref(''),
            registerUsername: ref(''),
            registerEmail: ref(''),
            registerPassword: ref(''),
            showAddThingModal,
            showEditThingModal,
            addThingLoading,
            editThingLoading,
            addThingError,
            editThingError,
            addThingSuccess,
            editThingSuccess,
            newThing,
            editThing,
            showAddExpenseModal,
            showEditExpenseModal,
            showExpensesListModal,
            addExpenseLoading,
            editExpenseLoading,
            addExpenseError,
            editExpenseError,
            addExpenseSuccess,
            editExpenseSuccess,
            newExpense,
            editExpense,
            showEditProfileModal,
            editProfileLoading,
            editProfileError,
            editProfileSuccess,
            editProfile,
            login,
            register,
            logout,
            fetchHomeData,
            formatToken,
            openAddThingModal,
            closeAddThingModal,
            openEditThingModal,
            closeEditThingModal,
            submitAddThing,
            submitEditThing,
            deleteThing,
            openAddExpenseModal,
            closeAddExpenseModal,
            openEditExpenseModal,
            closeEditExpenseModal,
            openExpensesListModal,
            closeExpensesListModal,
            submitAddExpense,
            submitEditExpense,
            deleteExpense,
            openEditProfileModal,
            closeEditProfileModal,
            submitEditProfile,
            normalizeDate,
            formatDateForInput,
            showRegisterPassword,
            showLoginPassword,
            showEditProfilePassword,
            showEditProfileConfirmPassword
        }
    },
    methods: {
        formatDate(dateString) {
            if (!dateString) return '-'
            const date = new Date(dateString)
            return date.toLocaleDateString('ru-RU')
        },
        formatCurrency(amount) {
            return new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0
            }).format(amount)
        }
    },
    template: `
    <div class="container">
        <!-- Шапка с токеном и кнопкой выхода -->
        <footer v-if="state.isAuthenticated" class="footer">
            <div class="token-info">
                <span>Токен: {{ formatToken(state.token) }}</span>
            </div>
            <div class="header-buttons">
                <button @click="openEditProfileModal" class="profile-btn">Профиль</button>
                <button @click="logout" class="logout-btn">Выйти</button>
            </div>
        </footer>
        
        <div class="content">
            <div v-if="state.loading" class="loading">Загрузка...</div>
            
            <div v-else>
            <!-- Если пользователь не авторизован, показываем формы -->
            <div v-if="!state.isAuthenticated">
                <!-- Заголовок -->
                <div class="app-title">
                    <h1 class="main-title">Расчет стоимости вещи во времени</h1>
                    <p class="subtitle">Учет владения, расходов и амортизации</p>
                </div>
                
                <!-- Формы авторизации/регистрации -->
                <div class="auth-forms">
                    <!-- Форма авторизации -->
                    <div v-if="!state.showRegisterForm" class="login-form">
                        <h2>Авторизация</h2>
                        <form @submit.prevent="login(username, password)">
                            <div class="form-group">
                                <label for="username">Username:</label>
                                <input 
                                    type="text" 
                                    id="username" 
                                    v-model="username"
                                    required
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="password">Password:</label>
                                <div class="password-field">
                                    <input 
                                        :type="showLoginPassword ? 'text' : 'password'" 
                                        id="password" 
                                        v-model="password"
                                        required
                                    >
                                    <button 
                                        type="button" 
                                        class="toggle-password"
                                        @click="showLoginPassword = !showLoginPassword"
                                        tabindex="-1"
                                    >
                                        {{ showLoginPassword ? '🙈' : '👁️' }}
                                    </button>
                                </div>
                            </div>
                            
                            <div v-if="state.error" class="error">{{ state.error }}</div>
                            <div v-if="state.registerSuccess" class="success">Регистрация прошла успешно! Теперь вы можете войти.</div>
                            
                            <button type="submit" :disabled="state.loading">
                                {{ state.loading ? 'Авторизация...' : 'Авторизоваться' }}
                            </button>
                        </form>
                        <div class="auth-switch">
                            <p>Нет аккаунта? <a href="#" @click.prevent="state.showRegisterForm = true">Зарегистрироваться</a></p>
                        </div>
                    </div>
                    
                    <!-- Форма регистрации -->
                    <div v-else class="register-form">
                        <h2>Регистрация</h2>
                        <form @submit.prevent="register(registerUsername, registerEmail, registerPassword)">
                            <div class="form-group">
                                <label for="registerUsername">Username:</label>
                                <input 
                                    type="text" 
                                    id="registerUsername" 
                                    v-model="registerUsername"
                                    required
                                    minlength="3"
                                >
                                <div class="field-hint">Минимум 3 символа</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="registerEmail">Email:</label>
                                <input 
                                    type="email" 
                                    id="registerEmail" 
                                    v-model="registerEmail"
                                    required
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="registerPassword">Password:</label>
                                <div class="password-field">
                                    <input 
                                        :type="showRegisterPassword ? 'text' : 'password'" 
                                        id="registerPassword" 
                                        v-model="registerPassword"
                                        required
                                        minlength="8"
                                    >
                                    <button 
                                        type="button" 
                                        class="toggle-password"
                                        @click="showRegisterPassword = !showRegisterPassword"
                                        tabindex="-1"
                                    >
                                        {{ showRegisterPassword ? '🙈' : '👁️' }}
                                    </button>
                                </div>
                                <div class="field-hint">Минимум 8 символов, должен содержать заглавные и строчные буквы, цифры</div>
                            </div>
        
                            <div v-if="state.error" class="error">{{ state.error }}</div>
                            
                            <button type="submit" :disabled="state.loading">
                                {{ state.loading ? 'Регистрация...' : 'Зарегистрироваться' }}
                            </button>
                        </form>
                        <div class="auth-switch">
                            <p>Уже есть аккаунт? <a href="#" @click.prevent="state.showRegisterForm = false">Войти</a></p>
                        </div>
                    </div>
                </div>
            </div>
                <div v-else class="data-table">
                    <div class="table-header">
                        <h2>Мои вещи</h2>
                        <button @click="openAddThingModal" class="add-thing-btn">
                            Добавить вещь
                        </button>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Название</th>
                                <th>Дата покупки</th>
                                <th>Цена покупки</th>
                                <th>Дата продажи</th>
                                <th>Цена продажи</th>
                                <th>Дней владения</th>
                                <th>Цена за день</th>
                                <th>Расходы</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in state.items" :key="item.id">
                                <td>{{ item.id }}</td>
                                <td>{{ item.name }}</td>
                                <td>{{ formatDate(item.pay_date) }}</td>
                                <td>{{ formatCurrency(item.pay_price) }}</td>
                                <td>{{ item.sale_date ? formatDate(item.sale_date) : '-' }}</td>
                                <td>{{ item.sale_price ? formatCurrency(item.sale_price) : '-' }}</td>
                                <td>{{ item.days }}</td>
                                <td>{{ formatCurrency(item.pay_day) }}</td>
                                <td>
                                    <button @click="openExpensesListModal(item)" class="view-expenses-btn">
                                        Показать ({{ item.expense ? item.expense.length : 0 }})
                                    </button>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button @click="openEditThingModal(item)" class="edit-btn">
                                            ✏️
                                        </button>
                                        <button @click="openAddExpenseModal(item.id)" class="add-expense-btn">
                                            💰
                                        </button>
                                        <button @click="deleteThing(item.id)" class="delete-btn">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div v-if="state.items.length === 0" class="empty-state">
                        <p>У вас пока нет вещей. Добавьте первую!</p>
                </div>
            </div>
        </div>
    
        <!-- Модальное окно для добавления вещи -->
        <div v-if="showAddThingModal" class="modal-overlay" @click="closeAddThingModal">
            <div class="modal-content" @click.stop>
                <h2>Добавить новую вещь</h2>
                <form @submit.prevent="submitAddThing">
                    <div class="form-group">
                        <label for="thingName">Название:</label>
                        <input 
                            type="text" 
                            id="thingName" 
                            v-model="newThing.name"
                            required
                            minlength="3"
                            placeholder="Например: Ноутбук MacBook Pro"
                        >
                        <div class="field-hint">Минимум 3 символа</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="payDate">Дата покупки:</label>
                        <input 
                            type="text" 
                            id="payDate" 
                            v-model="newThing.pay_date"
                            required
                            placeholder="ДД.ММ.ГГГГ"
                        >
                        <div class="field-hint">Формат: ДД.ММ.ГГГГ (например: 22.12.2006)</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="payPrice">Цена покупки:</label>
                        <input 
                            type="number" 
                            id="payPrice" 
                            v-model="newThing.pay_price"
                            required
                            min="1"
                            step="1"
                            placeholder="100000"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="saleDate">Дата продажи:</label>
                        <input 
                            type="text" 
                            id="saleDate" 
                            v-model="newThing.sale_date"
                            placeholder="ДД.ММ.ГГГГ"
                        >
                        <div class="field-hint">Необязательно. Формат: ДД.ММ.ГГГГ</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="salePrice">Цена продажи:</label>
                        <input 
                            type="number" 
                            id="salePrice" 
                            v-model="newThing.sale_price"
                            min="0"
                            step="1"
                            placeholder="0"
                        >
                    </div>
                    
                    <div v-if="addThingError" class="error">{{ addThingError }}</div>
                    <div v-if="addThingSuccess" class="success">Вещь успешно добавлена!</div>
                    
                    <div class="modal-buttons">
                        <button type="button" @click="closeAddThingModal" class="cancel-btn">
                            Отмена
                        </button>
                        <button type="submit" :disabled="addThingLoading" class="submit-btn">
                            {{ addThingLoading ? 'Добавление...' : 'Добавить' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    
        <!-- Модальное окно для редактирования вещи -->
        <div v-if="showEditThingModal" class="modal-overlay" @click="closeEditThingModal">
            <div class="modal-content" @click.stop>
                <h2>Редактировать вещь</h2>
                <form @submit.prevent="submitEditThing">
                    <div class="form-group">
                        <label for="editThingName">Название:</label>
                        <input 
                            type="text" 
                            id="editThingName" 
                            v-model="editThing.name"
                            required
                            minlength="3"
                            placeholder="Например: Ноутбук MacBook Pro"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="editPayDate">Дата покупки:</label>
                        <input 
                            type="text" 
                            id="editPayDate" 
                            v-model="editThing.pay_date"
                            required
                            placeholder="ДД.ММ.ГГГГ"
                        >
                        <div class="field-hint">Формат: ДД.ММ.ГГГГ (например: 22.12.2006)</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editPayPrice">Цена покупки:</label>
                        <input 
                            type="number" 
                            id="editPayPrice" 
                            v-model="editThing.pay_price"
                            required
                            min="1"
                            step="1"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="editSaleDate">Дата продажи:</label>
                        <input 
                            type="text" 
                            id="editSaleDate" 
                            v-model="editThing.sale_date"
                            placeholder="ДД.ММ.ГГГГ"
                        >
                        <div class="field-hint">Необязательно. Формат: ДД.ММ.ГГГГ</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editSalePrice">Цена продажи:</label>
                        <input 
                            type="number" 
                            id="editSalePrice" 
                            v-model="editThing.sale_price"
                            min="0"
                            step="1"
                        >
                    </div>
                    
                    <div v-if="editThingError" class="error">{{ editThingError }}</div>
                    <div v-if="editThingSuccess" class="success">Вещь успешно обновлена!</div>
                    
                    <div class="modal-buttons">
                        <button type="button" @click="closeEditThingModal" class="cancel-btn">
                            Отмена
                        </button>
                        <button type="submit" :disabled="editThingLoading" class="submit-btn">
                            {{ editThingLoading ? 'Сохранение...' : 'Сохранить' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    
        <!-- Модальное окно для добавления расхода -->
        <div v-if="showAddExpenseModal" class="modal-overlay active-modal" @click="closeAddExpenseModal">
            <div class="modal-content" @click.stop>
                <h2>Добавить расход</h2>
                <form @submit.prevent="submitAddExpense">
                    <div class="form-group">
                        <label for="expenseThingId">ID вещи:</label>
                        <input 
                            type="number" 
                            id="expenseThingId" 
                            v-model="newExpense.thing_id"
                            disabled
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="expenseSum">Сумма:</label>
                        <input 
                            type="number" 
                            id="expenseSum" 
                            v-model="newExpense.sum"
                            required
                            min="1"
                            step="1"
                            placeholder="1000"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="expenseDescription">Описание:</label>
                        <input 
                            type="text" 
                            id="expenseDescription" 
                            v-model="newExpense.description"
                            required
                            minlength="3"
                            placeholder="Например: Замена аккумулятора"
                        >
                        <div class="field-hint">Минимум 3 символа</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="expenseDate">Дата расхода:</label>
                        <input 
                            type="text" 
                            id="expenseDate" 
                            v-model="newExpense.expense_date"
                            required
                            placeholder="ДД.ММ.ГГГГ"
                        >
                        <div class="field-hint">Формат: ДД.ММ.ГГГГ (например: 22.12.2006)</div>
                    </div>
                    
                    <div v-if="addExpenseError" class="error">{{ addExpenseError }}</div>
                    <div v-if="addExpenseSuccess" class="success">Расход успешно добавлен!</div>
                    
                    <div class="modal-buttons">
                        <button type="button" @click="closeAddExpenseModal" class="cancel-btn">
                            Отмена
                        </button>
                        <button type="submit" :disabled="addExpenseLoading" class="submit-btn">
                            {{ addExpenseLoading ? 'Добавление...' : 'Добавить' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    
        <!-- Модальное окно для редактирования расхода -->
        <div v-if="showEditExpenseModal" class="modal-overlay active-modal" @click="closeEditExpenseModal">
            <div class="modal-content" @click.stop>
                <h2>Редактировать расход</h2>
                <form @submit.prevent="submitEditExpense">
                    <div class="form-group">
                        <label for="editExpenseThingId">ID вещи:</label>
                        <input 
                            type="number" 
                            id="editExpenseThingId" 
                            v-model="editExpense.thing_id"
                            disabled
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="editExpenseSum">Сумма:</label>
                        <input 
                            type="number" 
                            id="editExpenseSum" 
                            v-model="editExpense.sum"
                            required
                            min="1"
                            step="1"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="editExpenseDescription">Описание:</label>
                        <input 
                            type="text" 
                            id="editExpenseDescription" 
                            v-model="editExpense.description"
                            required
                            minlength="3"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="editExpenseDate">Дата расхода:</label>
                        <input 
                            type="text" 
                            id="editExpenseDate" 
                            v-model="editExpense.expense_date"
                            required
                            placeholder="ДД.ММ.ГГГГ"
                        >
                        <div class="field-hint">Формат: ДД.ММ.ГГГГ</div>
                    </div>
                    
                    <div v-if="editExpenseError" class="error">{{ editExpenseError }}</div>
                    <div v-if="editExpenseSuccess" class="success">Расход успешно обновлен!</div>
                    
                    <div class="modal-buttons">
                        <button type="button" @click="closeEditExpenseModal" class="cancel-btn">
                            Отмена
                        </button>
                        <button type="submit" :disabled="editExpenseLoading" class="submit-btn">
                            {{ editExpenseLoading ? 'Сохранение...' : 'Сохранить' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    
        <!-- Модальное окно для просмотра расходов вещи -->
        <div v-if="showExpensesListModal && state.selectedThingForExpenses" class="modal-overlay" @click="closeExpensesListModal">
            <div class="modal-content wide-modal" @click.stop>
                <h2>Расходы для вещи: {{ state.selectedThingForExpenses.name }}</h2>
                
                <div class="expenses-list">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Сумма</th>
                                <th>Описание</th>
                                <th>Дата</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="expense in state.selectedThingForExpenses.expense" :key="expense.id">
                                <td>{{ expense.id }}</td>
                                <td>{{ formatCurrency(expense.sum) }}</td>
                                <td>{{ expense.description }}</td>
                                <td>{{ formatDate(expense.expense_date) }}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button @click="openEditExpenseModal(expense)" class="edit-btn">
                                            ✏️
                                        </button>
                                        <button @click="deleteExpense(expense.id)" class="delete-btn">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div v-if="!state.selectedThingForExpenses.expense || state.selectedThingForExpenses.expense.length === 0" class="empty-state">
                        <p>Для этой вещи пока нет расходов</p>
                    </div>
                </div>
                
                <div class="modal-buttons">
                    <button @click="openAddExpenseModal(state.selectedThingForExpenses.id)" class="add-btn">
                        Добавить расход
                    </button>
                    <button type="button" @click="closeExpensesListModal" class="cancel-btn">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    
        <!-- Модальное окно для редактирования профиля -->
        <div v-if="showEditProfileModal" class="modal-overlay" @click="closeEditProfileModal">
            <div class="modal-content" @click.stop>
                <h2>Редактировать профиль</h2>
                <form @submit.prevent="submitEditProfile">
                    <div class="form-group">
                        <label for="editUsername">Новое имя пользователя:</label>
                        <input 
                            type="text" 
                            id="editUsername" 
                            v-model="editProfile.username"
                            minlength="3"
                        >
                        <div class="field-hint">Оставьте пустым, если не хотите менять</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editPassword">Новый пароль:</label>
                        <input 
                            type="password" 
                            id="editPassword" 
                            v-model="editProfile.password"
                            minlength="8"
                        >
                        <div class="field-hint">Оставьте пустым, если не хотите менять. Минимум 8 символов</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword">Подтвердите пароль:</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            v-model="editProfile.confirmPassword"
                            minlength="8"
                        >
                    </div>
                    
                    <div v-if="editProfileError" class="error">{{ editProfileError }}</div>
                    <div v-if="editProfileSuccess" class="success">Профиль успешно обновлен! Вы будете перенаправлены на страницу входа.</div>
                    
                    <div class="modal-buttons">
                        <button type="button" @click="cancelEditExpense" class="cancel-btn">
                            Отмена
                        </button>
                        <button type="submit" :disabled="editProfileLoading" class="submit-btn">
                            {{ editProfileLoading ? 'Сохранение...' : 'Сохранить' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `
}
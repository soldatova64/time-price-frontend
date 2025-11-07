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

export default {
    setup() {
        const state = reactive({
            isAuthenticated: false,
            loading: false,
            error: '',
            items: [],
            token: getCookie('auth_token') || '',
            showRegisterForm: false,
            registerSuccess: false
        })

        // Реактивные данные для модального окна добавления вещи
        const showAddThingModal = ref(false)
        const addThingLoading = ref(false)
        const addThingError = ref('')
        const addThingSuccess = ref(false)

        const newThing = reactive({
            name: '',
            pay_date: '',
            pay_price: 0,
            sale_date: '',
            sale_price: 0
        })

        // Базовый URL API
        const API_BASE = '/api'

        // Методы для работы с добавлением вещи
        const openAddThingModal = () => {
            showAddThingModal.value = true
            addThingError.value = ''
            addThingSuccess.value = false
            // Сброс формы
            Object.assign(newThing, {
                name: '',
                pay_date: '',
                pay_price: 0,
                sale_date: '',
                sale_price: 0
            })
        }

        const closeAddThingModal = () => {
            showAddThingModal.value = false
        }

        const submitAddThing = async () => {
            addThingLoading.value = true
            addThingError.value = ''
            addThingSuccess.value = false

            try {
                // Валидация на клиенте
                if (!newThing.name || newThing.name.length < 3) {
                    throw new Error('Название должно содержать минимум 3 символа')
                }
                if (!newThing.pay_date) {
                    throw new Error('Дата покупки обязательна')
                }
                if (!newThing.pay_price || newThing.pay_price <= 0) {
                    throw new Error('Цена покупки должна быть больше 0')
                }

                // Подготовка данных для отправки
                const requestData = {
                    name: newThing.name,
                    pay_date: newThing.pay_date + 'T00:00:00Z', // Преобразуем в RFC3339
                    pay_price: parseInt(newThing.pay_price),
                    sale_date: newThing.sale_date ? newThing.sale_date + 'T00:00:00Z' : null,
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
                // Закрываем модальное окно через 1.5 секунды и обновляем данные
                setTimeout(() => {
                    closeAddThingModal()
                    fetchHomeData() // Обновляем список вещей
                }, 1500)

            } catch (err) {
                addThingError.value = err.message || 'Ошибка при добавлении вещи'
                console.error('Ошибка добавления вещи:', err)
            } finally {
                addThingLoading.value = false
            }
        }

        // Проверяем авторизацию при загрузке
        onMounted(async () => {
            if (state.token) {
                state.isAuthenticated = true
                await fetchHomeData()
            }
        })

        // Функция для получения данных с главной
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

        // Функция авторизации
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

                // Сохраняем токен в cookies на 1 день
                const expires = new Date()
                expires.setDate(expires.getDate() + 1)
                document.cookie = `auth_token=${state.token}; expires=${expires.toUTCString()}; path=/`

                state.isAuthenticated = true
                await fetchHomeData()  // ← После авторизации загружаем данные

            } catch (err) {
                state.error = err.message || 'Неверные учетные данные'
                console.error('Ошибка авторизации:', err)
            } finally {
                state.loading = false
            }
        }

        // Функция регистрации
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

        // Функция выхода
        const logout = () => {
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
            state.isAuthenticated = false
            state.token = ''
            state.items = []
        }

        return {
            state,
            username: ref(''),
            password: ref(''),
            registerUsername: ref(''),
            registerEmail: ref(''),
            registerPassword: ref(''),
            showAddThingModal,
            addThingLoading,
            addThingError,
            addThingSuccess,
            newThing,
            login,
            register,
            logout,
            fetchHomeData,
            formatToken,
            openAddThingModal,
            closeAddThingModal,
            submitAddThing
        }
    },
    template: `
    <div class="container">
        <!-- Шапка с токеном и кнопкой выхода -->
        <footer v-if="state.isAuthenticated" class="footer">
            <div class="token-info">
                <span>Токен: {{ formatToken(state.token) }}</span>
            </div>
            <button @click="logout" class="logout-btn">Выйти</button>
        </footer>
        
        <div class="content">
            <div v-if="state.loading" class="loading">Загрузка...</div>
            
            <div v-else>
                <!-- Форма авторизации/регистрации, если пользователь не аутентифицирован -->
                <div v-if="!state.isAuthenticated" class="auth-forms">
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
                                <input 
                                    type="password" 
                                    id="password" 
                                    v-model="password"
                                    required
                                >
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
                                <input 
                                    type="password" 
                                    id="registerPassword" 
                                    v-model="registerPassword"
                                    required
                                    minlength="8"
                                >
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
                
                <!-- Таблица с данными, если пользователь аутентифицирован -->
                <div v-else class="data-table">
                    <h2>Список вещей</h2>
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
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in state.items" :key="item.id">
                                <td>{{ item.id }}</td>
                                <td>{{ item.name }}</td>
                                <td>{{ formatDate(item.pay_date) }}</td>
                                <td>{{ item.pay_price }}</td>
                                <td>{{ item.sale_date ? formatDate(item.sale_date) : '-' }}</td>
                                <td>{{ item.sale_price || '-' }}</td>
                                <td>{{ item.days }}</td>
                                <td>{{ item.pay_day.toFixed(2) }}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <!-- Кнопка добавления вещи -->
                    <div class="add-thing-section">
                        <button @click="openAddThingModal" class="add-thing-btn">
                            Добавить вещь
                        </button>
                    </div>
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
                        >
                        <div class="field-hint">Минимум 3 символа</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="payDate">Дата покупки:</label>
                        <input 
                            type="date" 
                            id="payDate" 
                            v-model="newThing.pay_date"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="payPrice">Цена покупки:</label>
                        <input 
                            type="number" 
                            id="payPrice" 
                            v-model="newThing.pay_price"
                            required
                            min="1"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="saleDate">Дата продажи:</label>
                        <input 
                            type="date" 
                            id="saleDate" 
                            v-model="newThing.sale_date"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="salePrice">Цена продажи:</label>
                        <input 
                            type="number" 
                            id="salePrice" 
                            v-model="newThing.sale_price"
                            min="0"
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
    </div>
    `,
    methods: {
        formatDate(dateString) {
            const date = new Date(dateString)
            return date.toLocaleDateString('ru-RU')
        }
    }
}
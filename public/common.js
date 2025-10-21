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

        // Базовый URL API
        const API_BASE = 'http://localhost:8080'

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
                await fetchHomeData()

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
            login,
            register,
            logout,
            fetchHomeData,
            formatToken
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
                                <td>{{ item.pay_day }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
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
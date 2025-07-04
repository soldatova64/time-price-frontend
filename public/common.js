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
            token: getCookie('auth_token') || ''
        })

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
                const response = await fetch('/api/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })

                if (response.status === 401) {
                    logout()
                    return
                }

                if (!response.ok) {
                    throw new Error('Ошибка загрузки данных')
                }

                const data = await response.json()
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
            try {
                const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                })

                if (!response.ok) {
                    throw new Error('Ошибка авторизации')
                }

                const data = await response.json()
                state.token = data.data.token

                // Сохраняем токен в cookies на 1 день
                const expires = new Date()
                expires.setDate(expires.getDate() + 1)
                document.cookie = `auth_token=${state.token}; expires=${expires.toUTCString()}; path=/`

                state.isAuthenticated = true
                await fetchHomeData()

            } catch (err) {
                state.error = 'Неверные учетные данные'
                console.error('Ошибка авторизации:', err)
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
            login,
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
                <!-- Форма авторизации, если пользователь не аутентифицирован -->
                <div v-if="!state.isAuthenticated" class="login-form">
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
                        
                        <button type="submit">Авторизоваться</button>
                    </form>
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
                                <td>{{ formatDate(item.sale_date) }}</td>
                                <td>{{ item.sale_price }}</td>
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
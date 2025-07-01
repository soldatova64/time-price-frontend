import { ref } from 'vue'

export default {
    setup() {
        const username = ref('')
        const password = ref('')
        const error = ref('')

        const login = async () => {
            error.value = ''
            try {
                const response = await fetch('/auth', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username.value,
                        password: password.value
                    })
                })

                if (!response.ok) {
                    throw new Error('Ошибка авторизации')
                }

                const data = await response.json()
                const token = data.data.token

                // Сохраняем токен в cookies на 1 день
                const expires = new Date()
                expires.setDate(expires.getDate() + 1)
                document.cookie = `auth_token=${token}; expires=${expires.toUTCString()}; path=/`

                // Можно добавить редирект или другие действия после авторизации
                alert('Авторизация успешна! Токен сохранен в cookies.')

            } catch (err) {
                error.value = 'Неверные учетные данные'
                console.error('Ошибка авторизации:', err)
            }
        }

        return {
            username,
            password,
            error,
            login
        }
    },
    template: `
    <div class="login-form">
        <h2>Авторизация</h2>
        <form @submit.prevent="login">
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
            
            <div v-if="error" class="error">{{ error }}</div>
            
            <button type="submit">Авторизоваться</button>
        </form>
    </div>
    `
}
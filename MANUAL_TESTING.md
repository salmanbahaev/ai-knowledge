# 🚀 AI Knowledge Platform - Запуск проекта

## Требования

- Python 3.13+
- Docker Desktop
- Git

## 🔧 Первый запуск (fresh install)

```bash
# 1. Клонировать репозиторий
git clone <repository-url>
cd ai-knowledge

# 2. Запустить PostgreSQL и Redis
docker-compose -f docker-compose.dev.yml up -d

# 3. Настроить backend
cd backend
pip install -r requirements.txt
cp env.example .env

# 4. Настроить базу данных
python -m alembic stamp head

# 5. Запустить приложение
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🔄 Повторный запуск

```bash
# 1. Запустить сервисы
docker-compose -f docker-compose.dev.yml up -d

# 2. Запустить приложение
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## ✅ Проверка работы

- **API документация:** http://localhost:8000/docs
- **Health check:** http://localhost:8000/api/v1/health/
- **Корневая страница:** http://localhost:8000/

### Ожидаемый результат health check:

```json
{
  "status": "healthy",
  "services": {
    "database": { "status": "healthy" },
    "cache": { "status": "healthy" },
    "application": { "status": "healthy" }
  }
}
```

## 🛠️ Troubleshooting

```bash
# Перезапуск сервисов
docker-compose -f docker-compose.dev.yml restart

# Проверка статуса сервисов
docker-compose -f docker-compose.dev.yml ps

# Просмотр логов
docker-compose -f docker-compose.dev.yml logs

# Остановка всех сервисов
docker-compose -f docker-compose.dev.yml down
```

# 🧪 Ручное тестирование AI Knowledge Platform - Этап 2.2

## 🚀 Запуск для тестирования

### 1. Запуск сервисов

```bash
# В корне проекта
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Настройка backend

```bash
cd backend
pip install -r requirements.txt
cp env.example .env
python -m alembic stamp head  # Пометить базу как актуальную
```

### 3. Запуск приложения

```bash
# ВАЖНО: Убедитесь что вы в папке backend
# Если нет, выполните: cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## ✅ Ручная проверка

### 1. API документация

**http://localhost:8000/docs** - должен показать Swagger UI

### 2. Health Checks

- **http://localhost:8000/api/v1/health/** - общий статус
- **http://localhost:8000/api/v1/health/database** - статус PostgreSQL
- **http://localhost:8000/api/v1/health/cache** - статус Redis

### 3. Корневая страница

**http://localhost:8000/** - основная страница приложения

## 🎯 Критерии успеха

- [x] Сервер запускается без ошибок
- [x] Health checks показывают "healthy"
- [x] Swagger UI доступен
- [x] Нет критичных ошибок в логах

## 🛠️ Troubleshooting

### PostgreSQL не подключается

```bash
docker-compose -f docker-compose.dev.yml restart postgres
```

### Redis не подключается

```bash
docker-compose -f docker-compose.dev.yml restart redis
```

### Migration ошибки

```bash
python -m alembic stamp head
```

DISCORD_TOKEN = "NzA1MTM3ODg2NDQ5NzYyMzM0.XrGENg.tSWvHvg2taXbvQhy_8hUagy1zmc"

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.path.join(BASE_DIR, 'db.postgresql'),
    }
}

CORS_ORIGIN_ALLOW_ALL = True
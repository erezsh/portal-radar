# Portal Radar


## Development

Setup:

```bash
$ pip install -r requirements.pip
$ cd server
$ edit "./server/conf/local_settings.py" # Follow format below
```

``` python3
DISCORD_TOKEN = "..."
CORS_ORIGIN_ALLOW_ALL = # True or False
```

```
$ python manage.py makemigrations stats
$ python manage.py migrate
$ python manage.py collectstatic
```

Run:
```
$ python manage.py runserver
$ python bot.py
```

# Portal Radar


## Development

Setup:

```bash
$ pip install requirements.pip
$ cd server
$ python manage.py migrate

$ edit "./server/conf/local_settings.py"
DISCORD_TOKEN = "..."
CORS_ORIGIN_ALLOW_ALL = ...
```

Run:
```
$ python manage.py run_server
$ python bot.py
```

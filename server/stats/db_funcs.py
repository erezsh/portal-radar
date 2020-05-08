from collections import defaultdict

import arrow

from django.db import connection

from stats.models import Message

from functools import wraps

from conf.settings import DB_TYPE


class Cache:
    def __init__(self, f, timeout, call_with_last_value):
        self.f = f
        self.timeout = timeout
        self.call_with_last_value = call_with_last_value

        self.last_save = defaultdict(lambda:None)
        self.value = {}

    def __call__(self, *args):
        last_save = self.last_save[args]
        if last_save is None or (arrow.now() - last_save).total_seconds() > self.timeout:
            if self.call_with_last_value:
                fargs = (self.value.get(args, None),) + args
            else:
                fargs = args
            self.value[args] = self.f(*fargs)
            self.last_save[args] = arrow.now()
        return self.value[args]

    def invalidate(self):
        self.last_save = defaultdict(lambda:None)


def cache(timeout, call_with_last_value=False):
    def dec(f):
        return wraps(f)(Cache(f, timeout, call_with_last_value))
    return dec



@cache(30)
def get_channel_messages_last_hour(channel):
    return Message.objects.filter(channel=channel, created_at__gte=arrow.utcnow().shift(hours=-1).datetime).count(),

@cache(30)
def get_channel_total_messages(channel):
    return Message.objects.filter(channel=channel).count()

@cache(5, call_with_last_value=True)
def get_channel_last_message(old_last_created, channel):
    try:
        last_message = Message.objects.filter(channel=channel).latest('created_at')
    except Message.DoesNotExist:
        return None
    last_created = last_message.created_at
    if last_created != old_last_created:
        print("new message")
        get_channel_messages_last_hour.invalidate()
        get_channel_total_messages.invalidate()

    return last_created



if DB_TYPE == 'sqlite':
    def dow(s):
        return f"strftime('%w', {s})"
    def hod(s):
        return f"strftime('%H', {s})"
    def woy(s):
        return f"strftime('%W', {s})"
elif DB_TYPE == 'postgres':
    def dow(s):
        return f"EXTRACT(DOW FROM {s})"
    def hod(s):
        return f"EXTRACT(HOUR FROM {s})"
    def woy(s):
        return f"EXTRACT(WEEK FROM {s})"
else:
    assert False

def update_stats():
    # table messages_grid = MessageLog {
    #     channel, day_of_week(date), hour(date)    // grouping keys
    #     =>
    #     count: count(id) / count_distinct(week_of_year(date))   // aggregated values
    # }

    # TODO this has to run every hour!!

    with connection.cursor() as cursor:
        cursor.execute('DELETE FROM stats_messagegrid;')
        q = (f"""
            INSERT INTO stats_messagegrid(channel_id, day_of_week, hour, count)
            SELECT
                channel_id,
                {dow('created_at')} as day_of_week,
                {hod('created_at')} as hour,
                (CAST(count(*) AS float) / count(distinct {woy('created_at')}))
            FROM stats_message
            GROUP BY channel_id, day_of_week, hour;
        """)
        print(q)
        cursor.execute(q)


def get_server_mph_by_dow(server):
    "Get messages-per-hour by day-of-week"
    base_dict = {n:0 for n in range(1,8)}
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT day_of_week+1, avg(count)
        FROM stats_messagegrid m
        JOIN stats_channel c ON m.channel_id = c.disc_id
        WHERE c.server_id = %s
        GROUP BY day_of_week
        """, [server.disc_id])
        base_dict.update( dict(cursor.fetchall()) )
        return base_dict


def get_server_mph_by_hod(server):
    "Get messages-per-hour by hour of day"
    base_dict = {n:0 for n in range(0,24)}
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT hour, avg(count)
        FROM stats_messagegrid m
        JOIN stats_channel c ON m.channel_id = c.disc_id
        WHERE c.server_id = %s
        GROUP BY hour
        """, [server.disc_id])
        base_dict.update( dict(cursor.fetchall()) )
        return base_dict

def get_channel_mph_by_dow(channel):
    "Get messages-per-hour by day-of-week"
    base_dict = {n:0 for n in range(1,8)}
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT day_of_week+1, avg(count)
        FROM stats_messagegrid
        WHERE channel_id = %s
        GROUP BY day_of_week
        """, [channel.disc_id])
        base_dict.update( dict(cursor.fetchall()) )
        return base_dict


def get_channel_mph_by_hod(channel):
    "Get messages-per-hour by hour of day"
    base_dict = {n:0 for n in range(0,24)}
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT hour, avg(count)
        FROM stats_messagegrid
        WHERE channel_id = %s
        GROUP BY hour
        """, [channel.disc_id])
        base_dict.update( dict(cursor.fetchall()) )
        return base_dict
from collections import defaultdict

import arrow

from django.db import connection

from stats.models import Message

from functools import wraps


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


def update_stats():
    # table messages_grid = MessageLog {
    #     channel, day_of_week(date), hour(date)    // grouping keys
    #     =>
    #     count: count(id) / count_distinct(week_of_year(date))   // aggregated values
    # }

    # XXX This query works on sqlite only!

    with connection.cursor() as cursor:
        cursor.execute('DELETE FROM "stats_messagegrid";')
        cursor.execute("""
            INSERT INTO "stats_messagegrid"(channel_id, day_of_week, hour, count)
            SELECT
                [channel_id],
                strftime('%w', [created_at]) as [day_of_week],
                strftime('%H', [created_at]) as [hour],
                (CAST(count(*) AS float) / count(distinct strftime('%W', [created_at])))
            FROM [stats_message]
            GROUP BY [channel_id], [day_of_week], [hour];
        """)


def get_server_mph_by_dow(server):
    "Get messages-per-hour by day-of-week"
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT [day_of_week]+1, avg([count])
        FROM [stats_messagegrid] m
        JOIN [stats_channel] c ON m.channel_id = c.disc_id
        WHERE c.server_id = %s
        GROUP BY [day_of_week]
        """, [server.disc_id])
        return dict(cursor.fetchall())


def get_server_mph_by_hod(server):
    "Get messages-per-hour by hour of day"
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT [hour], avg([count])
        FROM [stats_messagegrid] m
        JOIN [stats_channel] c ON m.channel_id = c.disc_id
        WHERE c.server_id = %s
        GROUP BY [hour]
        """, [server.disc_id])
        return dict(cursor.fetchall())

def get_channel_mph_by_dow(channel):
    "Get messages-per-hour by day-of-week"
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT [day_of_week]+1, avg([count])
        FROM [stats_messagegrid]
        WHERE channel_id = %s
        GROUP BY [day_of_week]
        """, [channel.disc_id])
        return dict(cursor.fetchall())


def get_channel_mph_by_hod(channel):
    "Get messages-per-hour by hour of day"
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT [hour], avg([count])
        FROM [stats_messagegrid]
        WHERE channel_id = %s
        GROUP BY [hour]
        """, [channel.disc_id])
        return dict(cursor.fetchall())
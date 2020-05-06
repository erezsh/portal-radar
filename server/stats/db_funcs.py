from django.db import connection

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
        GROUP BY [day_of_week]
        HAVING c.server_id = %s
        """, [server.disc_id])
        return dict(cursor.fetchall())


def get_server_mph_by_hod(server):
    "Get messages-per-hour by hour of day"
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT [hour], avg([count])
        FROM [stats_messagegrid] m
        JOIN [stats_channel] c ON m.channel_id = c.disc_id
        GROUP BY [hour]
        HAVING c.server_id = %s
        """, [server.disc_id])
        return dict(cursor.fetchall())

def get_channel_mph_by_dow(channel):
    "Get messages-per-hour by day-of-week"
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT [day_of_week]+1, avg([count])
        FROM [stats_messagegrid] m
        WHERE m.channel_id = %s
        """, [channel.disc_id])
        return dict(cursor.fetchall())


def get_channel_mph_by_hod(channel):
    "Get messages-per-hour by hour of day"
    with connection.cursor() as cursor:
        cursor.execute("""
        SELECT [hour], avg([count])
        FROM [stats_messagegrid] m
        WHERE m.channel_id = %s
        """, [channel.disc_id])
        return dict(cursor.fetchall())
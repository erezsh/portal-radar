from django.shortcuts import render

import arrow
import django_hug
from marshmallow import fields

routes = django_hug.Routes()

from stats.models import User, Channel, Server, Member, Message, MessageGrid



from django.db.models import Sum


from . import db_funcs

def output_date(d):
    return {'date': d, 'date_text': arrow.get(d).humanize()}

def server_stats(server):
    """
   	member count
	member growth rate
	channel count

	users joined today (updates)
	messages in last hour (updates)

	avg-messages-per-hour, for each day of the week

	messages-per-hour , for each hour of the day (24 values)
    """
    members_count = server.members.count()
    first_joined = server.members.order_by('joined_at')[0].joined_at
    days_since = (arrow.now() - first_joined).days

    return {
        'id': str(server.disc_id),
        'name': server.name,
        'total_members': members_count,
        'total_messages': Message.objects.filter(channel__server=server).count(),

        'members_joined_per_day_avg': members_count / days_since,
        'channel_count': server.channels.count(),

        'members_joined_last_24h': server.members.filter(joined_at__gte = arrow.utcnow().shift(days=-1).datetime).count(),
        'messages_last_hour': Message.objects.filter(channel__server=server, created_at__gte = arrow.utcnow().shift(hours=-1).datetime).count(),
        'last_message': output_date(Message.objects.filter(channel__server=server).order_by('-created_at')[0].created_at),

        'mph_by_dow': db_funcs.get_server_mph_by_dow(server),
        'mph_by_hod': db_funcs.get_server_mph_by_hod(server),
    }

def channel_stats(channel, from_update):
    """
	messages in last hour  (updates)
	avg-messages-per-hour, for each day of the week
	messages-per-hour , for each hour of the day (24 values)
    """

    last_message = db_funcs.get_channel_last_message(channel)   # Keep this first, it refreshes the cache
    if last_message is None:
        return None

    total_messages = db_funcs.get_channel_total_messages(channel)
    if total_messages <= 1:
        return None

    json = {
        'id': str(channel.disc_id),
        'name': channel.name,
        'total_messages': total_messages,

        'messages_last_hour': db_funcs.get_channel_messages_last_hour(channel),
        'last_message': output_date(last_message),
    }

    if not from_update:
        json.update({
            'mph_by_dow': db_funcs.get_channel_mph_by_dow(channel),
            'mph_by_hod': db_funcs.get_channel_mph_by_hod(channel),
    })

    return json


@routes.get('servers/')
def servers(request):
    servers = Server.objects.all()
    return {s.disc_id: server_stats(s) for s in servers}

@routes.get('channels/<server_id>/')
def channels(request, server_id, update=False):
    server = Server.objects.get(disc_id=server_id)
    channels = server.channels.all()

    stats = [channel_stats(c, update) for c in channels]
    return {c['id']: c for c in stats if c}

# -*- coding: utf-8 -*-
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "conf.settings")
django.setup()

from stats.models import User, Channel, Server, Member, Message, MessageGrid
from conf.settings import DISCORD_TOKEN

import discord

from tqdm import tqdm

from asgiref.sync import sync_to_async

def get_server(disc_guild):
    print("get server")
    server, _ = Server.objects.get_or_create(
            disc_id=disc_guild.id,
            defaults={ 'name': disc_guild.name, }
        )
    return server

def get_user(disc_user):
    user, _ = User.objects.get_or_create(
            disc_id=disc_user.id,
            defaults={ 'name': disc_user.name }
        )
    return user

def get_channel(disc_channel, server):
    channel, _ = Channel.objects.get_or_create(
            disc_id=disc_channel.id,
            defaults={ 'name': disc_channel.name, 'server': server }
        )
    return channel


import arrow
def import_date(d):
    return arrow.get(d, 'UTC').datetime

def get_message(message):
    try:
        return Message.objects.get(disc_id=message.id)
    except Message.DoesNotExist:
        server = get_server(message.guild),

        m = Message(
            disc_id=message.id,
            author = get_user(message.author),
            channel = get_channel(message.channel, server),
            created_at = import_date(message.created_at),
        )
        m.save()
        return m

def get_member(member):
    server = get_server(member.guild)
    user = get_user(member)

    m, _ = Member.objects.get_or_create(
            user=user, server=server,
            defaults={ 'joined_at': import_date(member.joined_at) }
        )
    return m

@sync_to_async
def new_message(m):
    return get_message(m)

@sync_to_async
def new_member(m):
    return get_member(m)

@sync_to_async
def get_all_channels_and_users(cli):
    for g in cli.guilds:
        server = get_server(g)
        print("Updating channels")
        for c in tqdm(g.channels):
            channel = get_channel(c, server)

    for g in cli.guilds:
        print("Updating members")
        for m in tqdm(g.members):
            member = get_member(m)

async def get_all_messages(cli):
    print("Getting all message history")
    for g in cli.guilds:
        for c in tqdm(g.text_channels):
            try:
                messages = await c.history().flatten()
            except discord.errors.Forbidden:
                continue

            for m in messages:
                await new_message(m)






from stats.db_funcs import update_stats

@sync_to_async
def print_db_stats():
    update_stats()
    print('%d channels' % Channel.objects.count())
    print('%d members' % Member.objects.count())
    print('%d messages' % Message.objects.count())
    print('%d items in message-grid' % MessageGrid.objects.count() )


class MyClient(discord.Client):
    async def on_ready(self):
        print('Logged in as')
        print(self.user.name)
        print(self.user.id)

        await get_all_channels_and_users(self)
        await get_all_messages(self)

        await print_db_stats()



    async def on_member_join(self, member):
        print("New member:", member)

        print(await new_member(member))



    async def on_message(self, message):
        print(f"New message in {message.channel.name} by {message.author.name} (bot={message.author.bot})")
        print(message.content)

        print( await new_message(message) )




def run():
    client = MyClient()
    client.run(DISCORD_TOKEN)

if __name__ == '__main__':
    run()
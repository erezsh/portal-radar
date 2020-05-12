# -*- coding: utf-8 -*-
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "conf.settings")
django.setup()

import sys

from stats.models import User, Channel, Server, Member, Message, MessageGrid
from conf.settings import DISCORD_TOKEN

import discord

from tqdm import tqdm

from asgiref.sync import sync_to_async

def get_server(disc_guild):
    server, _ = Server.objects.get_or_create(
            disc_id=str(disc_guild.id),
            defaults={ 'name': disc_guild.name, }
        )
    return server

def get_user(disc_user):
    user, _ = User.objects.get_or_create(
            disc_id=str(disc_user.id),
            defaults={ 'name': disc_user.name }
        )
    return user

def get_channel(disc_channel, server):
    channel, _ = Channel.objects.get_or_create(
            disc_id=str(disc_channel.id),
            defaults={ 'name': disc_channel.name, 'server': server }
        )
    return channel

def update_channel(disc_channel, server):
    channel = get_channel(disc_channel, server)
    channel.type = disc_channel.type.name
    channel.name = disc_channel.name
    if channel.type == 'text':
        channel.desc = disc_channel.topic or ''
    channel.save()
        # category = String(null=True)

def update_user(disc_user):
    user = get_user(disc_user)
    user.name = disc_user.name
    user.bot = disc_user.bot
    user.created_at = import_date(disc_user.created_at)
    user.save()


import arrow
def import_date(d):
    return arrow.get(d, 'UTC').datetime

def get_message(message):
    try:
        return Message.objects.get(disc_id=str(message.id))
    except Message.DoesNotExist:
        server = get_server(message.guild),

        m = Message(
            disc_id=str(message.id),
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
def new_message(disc_m, update=False):
    m = get_message(disc_m)
    if update:
        m.text = disc_m.content
        m.reactions = sum([r.count for r in disc_m.reactions])
        m.save()

    return m

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

async def get_all_messages(cli, limit=100, update=False):
    print("Getting all message history")
    for g in cli.guilds:
        for c in tqdm(g.text_channels):
            try:
                messages = await c.history(limit=limit).flatten()
            except discord.errors.Forbidden:
                continue

            for m in messages:
                await new_message(m, update)



@sync_to_async
def update_all_channels_and_users(cli):
    print("Updating channels")
    for g in cli.guilds:
        server = get_server(g)
        for c in tqdm(g.channels):
            update_channel(c, server)

    print("Updating members")
    for g in cli.guilds:
        for m in tqdm(g.members):
            update_user(m)



from stats.db_funcs import update_stats

@sync_to_async
def update_db_stats():
    print("Updating stats")
    update_stats()

@sync_to_async
def print_db_stats():
    print('%d channels' % Channel.objects.count())
    print('%d members' % Member.objects.count())
    print('%d messages' % Message.objects.count())
    print('%d items in message-grid' % MessageGrid.objects.count() )


class DebugClient(discord.Client):
    async def on_ready(self):
        breakpoint()

class BuildDbClient(discord.Client):
    async def on_ready(self):
        print('Building full_db')
        # await get_all_channels_and_users(self)
        await update_all_channels_and_users(self)
        await get_all_messages(self, limit=None, update=True)
        await update_db_stats()
        await print_db_stats()


class MyClient(discord.Client):
    async def on_ready(self):
        print('Logged in as')
        print(self.user.name)
        print(self.user.id)

        # await get_all_channels_and_users(self)
        await get_all_messages(self)
        await update_db_stats()
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

def build_db():
    client = BuildDbClient()
    client.run(DISCORD_TOKEN)

def debug():
    client = DebugClient()
    client.run(DISCORD_TOKEN)

def main(args):
    cmd ,= args
    f = {
        'run': run,
        'build_db': build_db,
        'debug': debug,
    }[cmd]()

if __name__ == '__main__':
    main(sys.argv[1:])

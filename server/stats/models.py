from django.db import models

# Create your models here.

from datetime import datetime

# import pendulum
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction

# import jsonfield

Model = models.Model

def apply_kw_with_defaults(field, **defaults):
    def _closure(*args, **kw):
        d = dict(defaults)
        d.update(kw)
        return field(*args, **d)
    return _closure

String = apply_kw_with_defaults(models.CharField, max_length=255, blank=True, null=False)
Int = apply_kw_with_defaults(models.IntegerField, null=False, blank=True)
Int0 = apply_kw_with_defaults(models.IntegerField, null=False, blank=True, default=0)
BigInt = apply_kw_with_defaults(models.BigIntegerField, null=False, blank=True)
PosInt = apply_kw_with_defaults(models.PositiveIntegerField, null=False, blank=True)
Float = apply_kw_with_defaults(models.FloatField, null=False, blank=True)
Bool = apply_kw_with_defaults(models.BooleanField, default=False, null=False, blank=False)
Text = apply_kw_with_defaults(models.TextField, blank=True, null=False)
Date = apply_kw_with_defaults(models.DateTimeField, null=False, blank=True)
ForeignKey = apply_kw_with_defaults(models.ForeignKey, null=False, on_delete=models.CASCADE)
M2M = apply_kw_with_defaults(models.ManyToManyField, blank=True)


class User(Model):
    disc_id = Int(primary_key=True)
    name = String()

class Server(Model):
    "Aka guild"

    disc_id = Int(primary_key=True)
    name = String()

    member_count = Int0()

class Channel(Model):
    disc_id = Int(primary_key=True)
    server = ForeignKey(Server, related_name='channels')

    name = String()

class Message(Model):
    disc_id = Int(primary_key=True)
    author = ForeignKey(User, related_name='messages')
    channel = ForeignKey(Channel, related_name='messages')
    created_at = Date()

class Member(Model):
    user = ForeignKey(User)
    server = ForeignKey(Server, related_name='members')
    joined_at = Date()

class MessageGrid(Model):
    channel = ForeignKey(Channel)
    day_of_week = Int()
    hour = Int()
    count = Int()


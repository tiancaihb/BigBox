# -*- coding: utf-8 -*-
# Generated by Django 1.10.6 on 2017-04-19 20:19
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('bigbox', '0002_shareditem'),
    ]

    operations = [
        migrations.RenameField(
            model_name='shareditem',
            old_name='item_id',
            new_name='items',
        ),
        migrations.RemoveField(
            model_name='shareditem',
            name='account',
        ),
    ]

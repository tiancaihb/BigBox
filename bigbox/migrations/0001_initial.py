# -*- coding: utf-8 -*-
# Generated by Django 1.10.6 on 2017-04-25 23:55
from __future__ import unicode_literals

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CloudInterface',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=20)),
                ('display_name', models.CharField(max_length=30)),
                ('icon', models.CharField(max_length=30)),
                ('class_name', models.CharField(max_length=30)),
            ],
        ),
        migrations.CreateModel(
            name='SharedItem',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('link', models.CharField(db_index=True, max_length=18)),
                ('basedir', models.TextField()),
                ('name', models.TextField()),
                ('is_public', models.BooleanField()),
                ('is_folder', models.BooleanField()),
                ('items', models.TextField()),
                ('created_at', models.DateTimeField()),
                ('view_count', models.IntegerField()),
                ('download_count', models.IntegerField()),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='owner',
                                            to=settings.AUTH_USER_MODEL)),
                ('readable_users', models.ManyToManyField(to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='StorageAccount',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('identifier', models.TextField()),
                ('status', models.IntegerField()),
                ('credentials', models.TextField(blank=True)),
                ('user_full_name', models.TextField()),
                ('user_short_name', models.TextField()),
                ('email', models.TextField()),
                ('display_name', models.TextField()),
                ('color', models.CharField(max_length=8)),
                ('cloud', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='bigbox.CloudInterface')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]

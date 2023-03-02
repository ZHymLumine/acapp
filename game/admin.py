from django.contrib import admin
from game.models.player.player import Player # 引入自己定义的表

# Register your models here.
admin.site.register(Player)

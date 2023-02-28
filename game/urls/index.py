from django.urls import path, include
from game.views.index import index

urlpatterns = [
    path("", index, name="index"),  #进入根目录
    path("menu/", include("game.urls.menu.index")),
    path("playground/", include("game.urls.playground.index")),
    path("settings/", include("game.urls.settings.index")),
]

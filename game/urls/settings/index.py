from django.urls import path, include
from game.views.settings.getinfo import InfoView
from game.views.settings.register import PlayerView
from game.views.settings.ranklist import RanklistView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [
        path("token/", TokenObtainPairView.as_view(), name="settings_token"),   # 获取token(利用post方法)
        path("token/refresh/", TokenRefreshView.as_view(), name="settings_token_refresh"), # 刷新token
        path("getinfo/", InfoView.as_view(), name="settings_info"),
        path("ranklist/", RanklistView.as_view(), name="settings_ranklist"),
        path("register/", PlayerView.as_view(), name="settings_register"),
        path("acwing/", include("game.urls.settings.acwing.index")),
]

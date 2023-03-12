import os

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'acapp.settings')
django.setup()

from game.channelsmiddleware import JwtAuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from game.routing import websocket_urlpatterns


# 让match_server可以调用客户端进程里的函数
from channels.layers import get_channel_layer
channel_layer = get_channel_layer()


application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns))   # 用自己定义的中间件做验证
})

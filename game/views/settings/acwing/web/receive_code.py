from django.shortcuts import redirect
from django.core.cache import cache
import requests
from django.contrib.auth.models import User
from game.models.player.player import Player
from django.contrib.auth import login
from random import randint


def receive_code(request):
    data = request.GET
    code = data.get('code')
    state = data.get('state')

    if not cache.has_keys(state):   # 授权不存在
        return redirect("index")
    cache.delete(state)

    apply_access_token_url = "https://www.acwing.com/third_party/api/oauth2/access_token/"
    params = {
        'appid': "4877",
        'secret': "bfcc6ad07c494c99862f451a780c22dd",
        'code': code,
    }

    access_token_res = requests.get(apply_access_token_url, params=params).json()   # 申请授权令牌

    access_token = access_token_res['access_token']
    openid = access_token_res['openid']

    players = Player.objects.filter(openid=openid)
    if player.exists():     # 如果该用户已存在，无需重新获取信息，直接登录
        login(request, players[0].user)
        return redirect("index")

    get_uesrinfo_url = "https://www.acwing.com/third_party/api/meta/identity/getinfo/"
    params = {
        'access_token': access_token,
        'openid': openid,
    }
    userinfo_res = requests.get(get_userinfo_url, params=params).json()    #申请用户信息
    username = userinfo_res['username']
    photo = userinfo_res['photo']

    while User.objects.filter(username=username).exists():  # 找到一个新用户名
        username += str(randint(0, 9))

    user = User.objects.create(username=username)    # 创建一个新用户
    player = Player.objects.create(user=user, photo=photo, openid=openid)   # 创建一个新player

    login(request, user)
    return redirect("index")

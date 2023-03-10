from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.conf import settings
from django.core.cache import cache

from thrift import Thrift
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol

from match_system.src.match_server.match_service import Match
from game.models.player.player import Player
from channels.db import database_sync_to_async  # 异步处理数据库

class MultiPlayer(AsyncWebsocketConsumer):
    async def connect(self):    # 与服务器建立连接
        await self.accept()

    """
        self.room_name = None
        for i in range(1000):   # 上限1000个游戏房间
            name = "room-%d" % (i)
            # 当前房间为空，或房间内人数不到ROOM_CAPACITY
            if not cache.has_key(name) or len(cache.get(name)) < settings.ROOM_CAPACITY:
                self.room_name = name
                break
        # 没有空闲房间，不创建连接
        if not self.room_name:
            return

        # 有空闲房间，创建与server的连接
        await self.accept()

        if not cache.has_key(self.room_name):   # 房间不存在，创建新房间
            cache.set(self.room_name, [], 3600) # 有效期一小时

        for player in cache.get(self.room_name):    # 把该房间已存在的用户信息发送到新加入的用户的游戏界面中
            await self.send(text_data=json.dumps({  # 字典转成字符串
                'event': "create_player",
                'uuid': player['uuid'],             # 其他用户的uuid， 发送回前端时，不会被忽略
                'username': player['username'],
                'photo': player['photo']
            }))
        await self.channel_layer.group_add(self.room_name, self.channel_name)   # 加入同一个组
    """

    async def disconnect(self, close_code):
        print('disconnect')
        if self.room_name:
            await self.channel_layer.group_discard(self.room_name, self.channel_name)


    async def create_player(self, data):
        self.room_name = None
        self.uuid = data['uuid']
        # Make socket
        transport = TSocket.TSocket('localhost', 9090)

        # Buffering is critical. Raw sockets are very slow
        transport = TTransport.TBufferedTransport(transport)

        # Wrap in a protocol
        protocol = TBinaryProtocol.TBinaryProtocol(transport)

        # Create a client to use the protocol encoder
        client = Match.Client(protocol)

        # 从数据库中获取玩家
        def db_get_player():
            return Player.objects.get(user__username=data['username'])

        player = await database_sync_to_async(db_get_player)()

        # Connect!
        transport.open()

        # 向server发送
        client.add_player(player.score, data['uuid'], data['username'], data['photo'], self.channel_name)

        # Close!
        transport.close()

        """
        players = cache.get(self.room_name)
        players.append({            # 将玩家自己加入到对局信息中
            'uuid': data['uuid'],
            'username': data['username'],
            'photo': data['photo']
        })
        cache.set(self.room_name, players, 3600)    # 有效期1小时
        await self.channel_layer.group_send(        # 群发消息
            self.room_name,
            {
                'type': "group_send_event",      # 发送到这个函数中处理
                'event': "create_player",
                'uuid': data['uuid'],
                'username': data['username'],
                'photo': data['photo'],
            }
        )
        """

    async def move_to(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_send_event",
                'event': "move_to",
                'uuid': data['uuid'],
                'tx': data['tx'],
                'ty': data['ty'],
            }
        )

    async def shoot_fireball(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_send_event",
                'event': "shoot_fireball",
                'uuid': data['uuid'],
                'tx': data['tx'],
                'ty': data['ty'],
                'ball_uuid': data['ball_uuid'],
            }
        )

    async def attack(self, data):
        if not self.room_name:
            return

        players = cache.get(self.room_name)

        if not players:
            return

        # 初始hp=100;被攻击4次死亡->每次被击中扣25hp
        for player in players:
            if player['uuid'] == data['attackee_uuid']: # 被击中
                player['hp'] -= 25

        remain_cnt = 0
        for player in players:
            if player['hp'] > 0:
                remain_cnt += 1

        if remain_cnt > 1:
            if self.room_name:
                cache.set(self.room_name, players, 3600)
        else:   # 游戏结束
            def db_update_player_score(username, score):
                player = Player.objects.get(user__username=username)
                player.score += score
                player.save()

            for player in players:
                if player['hp'] <= 0:
                    await database_sync_to_async(db_update_player_score)(player['username'], -5)
                else:
                    await database_sync_to_async(db_update_player_score)(player['username'], 10)

        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_send_event",
                'event': "attack",
                'uuid': data['uuid'],
                'attackee_uuid': data['attackee_uuid'],
                'x': data['x'],
                'y': data['y'],
                'angle': data['angle'],
                'damage': data['damage'],
                'ball_uuid': data['ball_uuid'],
            }
        )

    async def blink(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_send_event",
                'event': "blink",
                'uuid': data['uuid'],
                'tx': data['tx'],
                'ty': data['ty'],
            }
        )

    async def message(self, data):
        await self.channel_layer.group_send(
            self.room_name,
            {
                'type': "group_send_event",
                'event': "message",
                'uuid': data['uuid'],
                'username': data['username'],
                'text': data['text'],
            }
        )

    # handler function
    async def group_send_event(self, data):
        if not self.room_name:
            keys = cache.keys("*%s*" % (self.uuid))
            if keys:
                self.room_name = keys[0]
        await self.send(text_data=json.dumps(data))


    async def receive(self, text_data):     # 接收前端发来的消息(send_create_player)
        data = json.loads(text_data)
        event = data['event']
        if event == "create_player":    # 根据前端的event，调用相应的函数处理
            await self.create_player(data)
        elif event == "move_to":
            await self.move_to(data)
        elif event == "shoot_fireball":
            await self.shoot_fireball(data)
        elif event == "attack":
            await self.attack(data)
        elif event == "blink":
            await self.blink(data)
        elif event == "message":
            await self.message(data)

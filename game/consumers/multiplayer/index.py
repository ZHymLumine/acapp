from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.conf import settings
from django.core.cache import cache


class MultiPlayer(AsyncWebsocketConsumer):
    async def connect(self):    # 与服务器建立连接
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

    async def disconnect(self, close_code):
        print('disconnect')
        await self.channel_layer.group_discard(self.room_name, self.channel_name)


    async def create_player(self, data):
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

    # handler function
    async def group_send_event(self, data):
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

from typing import List
import discord
from discord import app_commands
from discord.ext import commands, tasks
import random
import config
import asyncio
import json
import requests
import time
import atexit
import aiohttp

bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())
chance = 50

# EVENTS
@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")

    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} slash command(s)")
    except Exception as e:
        print(f"Error syncing slash commands: {e}")

    await bot.change_presence(
        activity=discord.CustomActivity(name="Playing Baldur's Gate 3")
    )

    if not get_lol_data.is_running():
        get_lol_data.start()


@bot.event
async def on_disconnect():
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} Bot disconnected. Starting reconnection check.")
    # Schedule a task to check after 600 seconds.
    asyncio.create_task(check_reconnection(600))

@bot.event
async def on_connect():
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} Bot connected.")


@bot.event
async def on_voice_state_update(member, before, after):
    if member.id != bot.user.id:
        updateLog(member, before, after)
    vc = discord.utils.get(bot.voice_clients, guild=member.guild)
    if after.channel and before.channel != after.channel:
        print(f"{member.id} has joined the voice channel")
        if not vc:
            await after.channel.connect()
            get_entrance_sound(member)
        if vc and vc.channel == after.channel:
            get_entrance_sound(member)
    
    # Fetch the user object for your user ID
    user = await bot.fetch_user(config.USER_ID)

    # Notify you if someone joins the waiting room while you're in the office channel
    if after.channel and after.channel.id == config.WAITING_ROOM_ID:
        guild = after.channel.guild
        me = guild.get_member(config.USER_ID)

        # Check if you are in the office channel
        if me and me.voice and me.voice.channel.id == config.OFFICE_CHANNEL_ID:
            await user.send(f"{member.name} has joined the waiting room.")

    if vc and vc.channel and len(vc.channel.members) == 1:
        await vc.disconnect()
        if play_random_sounds.is_running():
            play_random_sounds.cancel()
        print("Bot has left the voice channel as it was left alone.")


# COMMANDS
@bot.tree.command(name="join", description="Join the voice channel")
async def join(interaction: discord.Interaction):
    try:
        # Connect to the voice channel of the user who sent the command
        await interaction.user.voice.channel.connect()
        await interaction.response.send_message(
            "Joined the voice channel", ephemeral=True, delete_after=10
        )
        if not play_random_sounds.is_running():
            play_random_sounds.start()
    except Exception as e:
        await interaction.response.send_message(
            f"Error joining voice channel: {e}", ephemeral=True, delete_after=10
        )


@bot.tree.command(name="leave", description="Leave the voice channel")
async def leave(interaction: discord.Interaction):
    channel = interaction.user.voice.channel
    try:
        await channel.guild.voice_client.disconnect()
        await interaction.response.send_message(
            "Left the voice channel", ephemeral=True, delete_after=10
        )
        play_random_sounds.cancel()
    except Exception as e:
        await interaction.response.send_message(
            f"Error leaving voice channel: {e}", ephemeral=True, delete_after=10
        )


@bot.tree.command(name="nick", description="Change a user's nickname")
@app_commands.describe(
    user="The user to change the nickname for",
    nickname="The new nickname",
    reason="The reason for the nickname change",
)
async def nick(
    interaction: discord.Interaction,
    user: discord.Member,
    nickname: str,
    reason: str = None,
):
    stigs_id = 236563657285304320
    try:
        await user.edit(nick=nickname)
        await interaction.response.send_message(
            f"Changed `@{user.name}`'s nickname to `{nickname}`."
            + (f"\n\nReason: {reason}" if reason else ""),
        )
    except:
        await interaction.response.send_message(
            f"<@{stigs_id}>! A request to change your nickname to `{nickname}` has been made."
            + (f"\n\nReason: {reason}" if reason else ""),
        )


sound_group = discord.app_commands.Group(
    name="sound", description="Play sound effects"
)
bot.tree.add_command(sound_group)


@sound_group.command(name="force", description="Play a random sound effect")
async def sound(interaction: discord.Interaction):
    print(f"{interaction.user.name} played a random sound effect")
    vc = discord.utils.get(bot.voice_clients)
    if not vc or not vc.is_connected() or vc.channel != interaction.user.voice.channel:
        await interaction.user.voice.channel.connect()
    try:
        play_sound()
        await interaction.response.send_message(
            "Playing a random sound effect", ephemeral=True, delete_after=10
        )
    except Exception as e:
        await interaction.response.send_message(
            f"Error playing sound effect: {e}", ephemeral=True, delete_after=10
        )


@sound_group.command(name="toggle", description="Toggle random sound effects")
async def toggle_random_sound(interaction: discord.Interaction):
    if play_random_sounds.is_running():
        print("Stopping random sounds")
        play_random_sounds.cancel()
        await interaction.response.send_message(
            "Random sound effects has been stopped", ephemeral=True, delete_after=10
        )
    else:
        print("Starting random sounds")
        play_random_sounds.start()
        await interaction.response.send_message(
            "Random sound effects has been started", ephemeral=True, delete_after=10
        )
    print(
        f"Random sounds is { play_random_sounds.is_running() and 'running' or 'stopped'}"
    )


@sound_group.command(
    name="interval", description="Set the interval for random sound effects"
)
@app_commands.describe(interval="The interval in seconds")
async def set_interval(interaction: discord.Interaction, interval: int):
    min = 5
    max = 300
    if interval >= min and interval <= max:
        play_random_sounds.change_interval(seconds=interval)
        await interaction.response.send_message(
            f"Set the interval for random sound effects to {interval} seconds",
            ephemeral=True,
            delete_after=10,
        )
        print(f"Random sounds interval: {play_random_sounds.seconds}sec")
    else:
        await interaction.response.send_message(
            f"Interval must be between {min} and {max} seconds",
            ephemeral=True,
            delete_after=10,
        )


@sound_group.command(
    name="chance",
    description="Set the chance for random sound effects to play on each interval",
)
@app_commands.describe(percentage="The chance as a percentage")
async def set_chance(interaction: discord.Interaction, percentage: int):
    global chance
    min = 1
    max = 100
    if percentage >= min and percentage <= max:
        chance = percentage
        await interaction.response.send_message(
            f"Set the chance for random sound effects to {percentage}%",
            ephemeral=True,
            delete_after=10,
        )
        print(f"Random sounds chance: {chance}%")
    else:
        await interaction.response.send_message(
            f"Interval must be between {min} and {max} seconds",
            ephemeral=True,
            delete_after=10,
        )


class Buttons(discord.ui.View):
    def __init__(self, sounds, page=-1, *, timeout=None):
        super().__init__(timeout=timeout)
        self.sounds = sounds
        self.page = page
        self.max_per_page = 3 * 4
        if page == -1:
            self.add_frontpage_buttons()
        else:
            self.add_buttons()

    def add_frontpage_buttons(self):
        favorites_button = discord.ui.Button(
            label="Favorites",
            style=discord.ButtonStyle.primary,
            row=0,
        )
        favorites_button.callback = self.show_favorites
        self.add_item(favorites_button)

        all_button = discord.ui.Button(
            label="All",
            style=discord.ButtonStyle.secondary,
            row=0,
        )
        all_button.callback = self.show_all
        self.add_item(all_button)

    async def show_favorites(self, interaction: discord.Interaction):
        user_id = interaction.user.id
        try: 
            with open('sounds.json', 'r') as f:
                sounds = json.load(f)
            sounds = sorted(sounds, key=lambda x: x['displayname'].lower())
                # find the user's favorite sounds in sound.favoritedBy[]
            favorite_sounds = [sound for sound in sounds if str(user_id) in sound.get('favoritedBy', [])]
            if not favorite_sounds:
                raise Exception("You have no favorite sounds")
        except Exception as e:
                await interaction.response.edit_message(content=f"Error: {e}")
                await asyncio.sleep(3)
                await interaction.followup.edit_message(view=self, content="Select a category:", message_id=interaction.message.id)
        view = Buttons(favorite_sounds, page=0)
        await interaction.response.edit_message(view=view, content="Choose a sound to play:")

    async def show_all(self, interaction: discord.Interaction):
        try: 
            with open('sounds.json', 'r') as f:
                sounds = json.load(f)
            sounds = sorted(sounds, key=lambda x: x['displayname'].lower())
        except Exception as e:
            await interaction.response.edit_message(content=f"Error: {e}")
            await asyncio.sleep(3)
            await interaction.followup.edit_message(view=self, content="Select a category:", message_id=interaction.message.id)
        view = Buttons(sounds, page=0)
        await interaction.response.edit_message(view=view, content="Choose a sound to play:")

    def add_buttons(self):
        start = self.page * self.max_per_page
        end = start + self.max_per_page
        max_label_length = max(
            len(sound['displayname'])
            for sound in self.sounds
        )
        pageTotal = (len(self.sounds) + self.max_per_page - 1) // self.max_per_page
        for index, sound in enumerate(self.sounds[start:end]):
            # every 3rd button is a new row starting at row 0
            row = index // 3
            label = sound['displayname']
            padded_label = label.center(
                max_label_length, ""
            )  # Adding spaces to both sides
            button = discord.ui.Button(
                label=padded_label,
                style=discord.ButtonStyle.gray,
                row=row,
            )
            button.callback = self.create_callback(sound)
            self.add_item(button)
        home_button = discord.ui.Button(
            label="☰",
            style=discord.ButtonStyle.success,
            row=4,
        )
        home_button.callback = self.create_callback_page(-1, "Select a category:")
        self.add_item(home_button)
        prev_button = discord.ui.Button(
            label="↩",
            style=discord.ButtonStyle.primary,
            row=4,
            disabled=self.page == 0,
        )
        prev_button.callback = self.create_callback_page(self.page - 1)
        self.add_item(prev_button)
        pagination = discord.ui.Button(
            label=f"{self.page + 1}/{pageTotal}",
            style=discord.ButtonStyle.gray,
            row=4,
            disabled=True,
        )
        self.add_item(pagination)
        next_button = discord.ui.Button(
            label="↪",
            style=discord.ButtonStyle.primary,
            row=4,
            disabled=end >= len(self.sounds),
        )
        next_button.callback = self.create_callback_page(self.page + 1)
        self.add_item(next_button)

    def create_callback(self, sound):
        async def callback(interaction: discord.Interaction):
            try:
                vc = discord.utils.get(bot.voice_clients)
                if (
                    not vc
                    or not vc.is_connected()
                    or vc.channel != interaction.user.voice.channel
                ):
                    await interaction.user.voice.channel.connect()
                print(f"{interaction.user.name} used soundboard")
                play_sound(sound['filename'], interaction.user)
                await interaction.response.edit_message(view=self)
            except Exception as e:
                await interaction.response.edit_message(content=f"Error: {e}")
                await asyncio.sleep(3)
                await interaction.followup.edit_message(view=self, content="Choose a sound to play:", message_id=interaction.message.id)
        return callback

    def create_callback_page(self, page, content = "Choose a sound to play:"):
        async def callback(interaction: discord.Interaction):
            view = Buttons(self.sounds, page=page)
            await interaction.response.edit_message(view=view, content=content)

        return callback


@bot.tree.command(name="soundboard", description="Show the soundboard")
async def soundboard(interaction: discord.Interaction):
    with open('sounds.json', 'r') as f:
        sounds = json.load(f)
    sounds = sorted(sounds, key=lambda x: x['displayname'].lower())
    view = Buttons(sounds)
    await interaction.response.send_message(
        "Select a category:", view=view, ephemeral=True
    )


lol_group = discord.app_commands.Group(
    name="lol", description="League of Legends commands"
)
bot.tree.add_command(lol_group)


@lol_group.command(name="add", description="Add a League of Legends account to track")
@app_commands.describe(account="Riot ID (e.g. Summoner#1234)", user="Discord user connected to the account")
async def add_lol_account(
    interaction: discord.Interaction,
    account: str,
    user: discord.Member,
):
    with open('lolUsers.json', 'r') as f:
        lol_users = json.load(f)
    for user_entry in lol_users:
        if user_entry["discord_id"] == str(user.id):
            await interaction.response.send_message(
                f"{user.name} already has an account linked.", ephemeral=True, delete_after=10
            )
            return
        if user_entry["account"].lower() == account.lower():
            await interaction.response.send_message(
                f"{account} is already being tracked.", ephemeral=True, delete_after=10
            )
            return
    lol_users.append({"account": account, "discord_id": str(user.id)})
    with open('lolUsers.json', 'w') as f:
        json.dump(lol_users, f, indent=2)
    await interaction.response.send_message(
        f"Added {account} for {user.name}", ephemeral=True, delete_after=10
    )


async def lol_list_autocomplete(
    interaction: discord.Interaction,
    current: str,
) -> List[app_commands.Choice[str]]:
    with open('lolUsers.json', 'r') as f:
        lol_users = json.load(f)
    return [
        app_commands.Choice(name=user["account"], value=user["account"])
        for user in lol_users if current.lower() in user["account"].lower()
    ]


@lol_group.command(name="remove", description="Remove a League of Legends account")
@app_commands.autocomplete(account=lol_list_autocomplete)
async def remove_lol_account(interaction: discord.Interaction, account: str):
    with open('lolUsers.json', 'r') as f:
        lol_users = json.load(f)
    for user in lol_users:
        if user["account"] == account:
            lol_users.remove(user)
            break
    with open('lolUsers.json', 'w') as f:
        json.dump(lol_users, f, indent=2)
    await interaction.response.send_message(
        f"Removed {account}", ephemeral=True, delete_after=10
    )


@lol_group.command(name="list", description="List all tracked League of Legends accounts")
async def list_lol_accounts(interaction: discord.Interaction):
    with open('lolUsers.json', 'r') as f:
        lol_users = json.load(f)
    accounts = "\n".join([f"{user['account']}" for user in lol_users])
    await interaction.response.send_message(
        f"Tracked accounts:\n{accounts}", ephemeral=True, delete_after=30
    )


# TASKS
@tasks.loop(seconds=60)
async def play_random_sounds():
    """Background task to play the sound effect randomly while the bot is connected."""
    # change is % chance of playing a sound effect use the change value to change the chance of playing a sound effect
    print(f"Checking if sound effect should be played...")
    if random.randint(1, 100) <= chance:
        try:
            play_sound()
        except Exception as e:
            print(f"Error playing sound effect: {e}")


@tasks.loop(seconds=300)
async def get_lol_data():
    print("Checking League of Legends match streaks...")
    with open('lolUsers.json', 'r') as f:
        lol_users = json.load(f)
    for user in lol_users:
        await check_match_streak(user)


# Functions
async def check_reconnection(timeout):
    await asyncio.sleep(timeout)
    # If the bot hasn’t become ready again, log the BOT_DOWN event.
    if not bot.is_closed() and not bot.is_ready():
        print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} Bot did not reconnect within {timeout} seconds, logging BOT_DOWN event.")
        log_bot_down(f"Bot did not reconnect within {timeout} seconds.")
    else:
        print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} Bot reconnected within {timeout} seconds—no BOT_DOWN log necessary.")


def get_entrance_sound(member: discord.Member):
    with open('sounds.json', 'r') as f:
        sounds = json.load(f)
    with open('users.json', 'r') as f:
        users = json.load(f)
    # find the user in users.json and check for entrance_sound and then find the sound in sounds.json ["filename"]
    for user in users:
        if user["id"] == str(member.id):
            if user["entrance_sound"]:
                for sound in sounds:
                    if sound["filename"] == user["entrance_sound"]:
                        play_sound(sound["filename"], member)
                        break
            break


def play_sound(sound: str = None, member: discord.Member = None):
    vc = discord.utils.get(bot.voice_clients)
    if not sound:
        with open('sounds.json', 'r') as f:
            sounds = json.load(f)
        sound = random.choice(sounds)['filename']
    if vc and vc.is_connected() and not vc.is_playing():
        vc.play(discord.FFmpegPCMAudio(f"sounds/{sound}"))
        print(f"Playing sound effect: {sound}")
        if member:
            # add log to sound
            with open('sounds.json', 'r') as f:
                sounds = json.load(f)
            user_found = False
            for s in sounds:
                if s['filename'] == sound:
                    if 'playedBy' not in s:
                        s['playedBy'] = []
                    for user in s['playedBy']:
                        if user["id"] == str(member.id):
                            user["times"] += 1
                            user_found = True
                            break
                    if not user_found:
                        s['playedBy'].append({"id": str(member.id),"name": member.name, "times": 1})
                    updateLog(member, None, None, s)
                    break
            with open('sounds.json', 'w') as f:
                json.dump(sounds, f, indent=2)
    elif vc and vc.is_playing():
        raise Exception("A sound is already playing")
    elif not vc or not vc.is_connected():
        play_random_sounds.cancel()
        raise Exception("Not connected to a voice channel")


async def fetch_api(url, params):
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as resp:
            resp.raise_for_status()
            return await resp.json()

async def check_match_streak(user):
    riot_name, riot_tag = user["account"].split("#")
    try:
        # Fetch the puuid using aiohttp
        url = f"https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{riot_name}/{riot_tag}"
        data = await fetch_api(url, params={"api_key": config.LOL_API_KEY})
        puuid = data["puuid"]

        # Fetch the match IDs
        url = f"https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        match_ids = await fetch_api(url, params={"queueId": 420, "count": 2, "api_key": config.LOL_API_KEY})

        # Fetch match details for each match ID
        win_statuses = []
        for match_id in match_ids:
            url = f"https://europe.api.riotgames.com/lol/match/v5/matches/{match_id}"
            match_details = await fetch_api(url, params={"api_key": config.LOL_API_KEY})
            participants = match_details["info"]["participants"]
            for participant in participants:
                if participant["puuid"] == puuid:
                    win_statuses.append(participant["win"])
                    break

        # Continue with updating nickname...
        guild = bot.get_guild(476435508638253056)
        member = guild.get_member(int(user["discord_id"]))
        if member:
            new_nick = member.display_name
            if len(win_statuses) == 2:
                if all(win_statuses):
                    if "(win streak)" not in new_nick:
                        new_nick = new_nick.replace("(loss streak)", "").strip() + " (win streak)"
                elif not any(win_statuses):
                    if "(loss streak)" not in new_nick:
                        new_nick = new_nick.replace("(win streak)", "").strip() + " (loss streak)"
                else:
                    new_nick = new_nick.replace("(win streak)", "").replace("(loss streak)", "").strip()
                
                if new_nick != member.display_name:
                    try:
                        await member.edit(nick=new_nick)
                        print(f"Updated {member.name} nickname to: {new_nick}")
                    except discord.errors.Forbidden:
                        print(f"Missing permissions to change nickname for {member.name}")

    except Exception as e:
        print(f"Error fetching data from the League of Legends API: {e}")

def updateLog(member, before, after, sound = None):
    with open('logs.json', 'r') as f:
        log = json.load(f)

    event = None
    if sound:
        event = "PLAYED_SOUND"
    if before and after:
        if before.channel is None and after.channel is not None:
            event = "JOINED_CHANNEL"
        elif before.channel is not None and after.channel is None:
            event = "LEFT_CHANNEL"
        elif before.channel != after.channel:
            event = "MOVED_CHANNEL"
        elif not before.self_stream and after.self_stream:
            event = "STARTED_STREAMING"
        elif before.self_stream and not after.self_stream:
            event = "STOPPED_STREAMING"
        elif before.self_deaf != after.self_deaf or before.self_mute != after.self_mute:
            event = "VOICE_STATE_CHANGED"

    if event:
        if sound:
            log_entry = {
                "event": event,
                "timestamp": int(time.time()),
                "user": {
                    "id": member.id,
                    "name": member.name,
                    "nick": member.nick,
                    "is_on_mobile": member.is_on_mobile(),
                },
                "voiceState": {
                    "deafened": False if event == "LEFT_CHANNEL" else member.voice.self_deaf,
                    "muted": False if event == "LEFT_CHANNEL" else member.voice.self_mute,
                },
                "channel": {
                    "id": member.voice.channel.id,
                    "name": member.voice.channel.name
                },
                "sound": {
                    "filename": sound["filename"],
                    "displayname": sound["displayname"],
                }
            }
        else:
            log_entry = {
                "event": event,
                "timestamp": int(time.time()),
                "user": {
                    "id": member.id,
                    "name": member.name,
                    "nick": member.nick,
                    "is_on_mobile": member.is_on_mobile(),
                },
                "voiceState": {
                    "deafened": False if event == "LEFT_CHANNEL" else member.voice.self_deaf,
                    "muted": False if event == "LEFT_CHANNEL" else member.voice.self_mute,
                },
                "channel": {
                    "id": after.channel.id if after.channel else (before.channel.id if before.channel else member.voice.channel.id),
                    "name": after.channel.name if after.channel else (before.channel.name if before.channel else member.voice.channel.name)
                }
            }
        log.append(log_entry)

        with open('logs.json', 'w') as f:
            json.dump(log, f, indent=2)

def log_bot_down(reason="Bot shut down"):
    with open('logs.json', 'r') as f:
        logs = json.load(f)
    # Only log if the last entry is not a "BOT_DOWN" event.
    if not logs or logs[-1].get("event") != "BOT_DOWN":
        logs.append({
            "event": "BOT_DOWN",
            "timestamp": int(time.time()),
            "reason": reason
        })
        with open('logs.json', 'w') as f:
            json.dump(logs, f, indent=2)
        print("BOT_DOWN event logged.")

atexit.register(log_bot_down)

try:
    bot.run(config.TOKEN)
except Exception as e:
    print(f"Error starting bot: {e}")
    log_bot_down("Error starting bot")
    raise e

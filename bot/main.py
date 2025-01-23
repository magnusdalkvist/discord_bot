from typing import List
import discord
from discord import app_commands
from discord.ext import commands, tasks
import random
import config
import os
import asyncio
import json

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


def get_entrance_sound(member):
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
                        play_sound(sound["filename"])
                        break
            break


@bot.event
async def on_voice_state_update(member, before, after):
    print(f"{member.id} has joined the voice channel")
    vc = discord.utils.get(bot.voice_clients, guild=member.guild)
    if after.channel and before.channel != after.channel:
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
        play_sound()
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


command_group = discord.app_commands.Group(
    name="sound", description="Play sound effects"
)
bot.tree.add_command(command_group)


@command_group.command(name="force", description="Play a random sound effect")
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


@command_group.command(name="toggle", description="Toggle random sound effects")
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


@command_group.command(
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


@command_group.command(
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
                play_sound(sound['filename'])
                # add log to sound
                with open('sounds.json', 'r') as f:
                    sounds = json.load(f)
                user_found = False
                for s in sounds:
                    if s['filename'] == sound['filename']:
                        if 'playedBy' not in s:
                            s['playedBy'] = []
                        for user in s['playedBy']:
                            if user["id"] == str(interaction.user.id):
                                user["times"] += 1
                                user_found = True
                                break
                        if not user_found:
                            s['playedBy'].append({"id": str(interaction.user.id),"name": interaction.user.name, "times": 1})
                        break
                with open('sounds.json', 'w') as f:
                    json.dump(sounds, f, indent=2)
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


# Functions
def play_sound(sound: str = None):
    vc = discord.utils.get(bot.voice_clients)
    if not sound:
        with open('sounds.json', 'r') as f:
            sounds = json.load(f)
        sound = random.choice(sounds)['filename']
    if vc and vc.is_connected() and not vc.is_playing():
        vc.play(discord.FFmpegPCMAudio(f"sounds/{sound}"))
        print(f"Playing sound effect: {sound}")
    elif vc and vc.is_playing():
        raise Exception("A sound is already playing")
    elif not vc or not vc.is_connected():
        play_random_sounds.cancel()
        raise Exception("Not connected to a voice channel")


bot.run(config.TOKEN)

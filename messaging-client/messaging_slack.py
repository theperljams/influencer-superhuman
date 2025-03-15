import time
from socketio import Client  # Change this line
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys  # For simulating key presses
from selenium.common.exceptions import (
    NoSuchElementException,
    ElementNotInteractableException,
    TimeoutException,
)
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import logging
import signal
import sys
import uuid
import hmac
import hashlib
import urllib.parse  # For parsing URLs

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configuration
WEBSOCKET_SERVER_URL = os.getenv("WEBSOCKET_SERVER_URL", "http://localhost:3001")
USER_ID = os.getenv(
    "USER_ID", "pearl@easyspeak-aac.com"
)  # Replace with your actual user ID or email
PEPPER = os.getenv('PEPPER', 'SuperSecretPepperValue')  # Securely store this in production
POLL_INTERVAL = 5  # Seconds between polling requests

# Initialize Socket.IO client with explicit configuration
sio = Client(
    logger=True,
    engineio_logger=True,
    reconnection=True,
    reconnection_attempts=5,
    reconnection_delay=1000,
)

# Flag to control the main loop
running = True

# Initialize variables to track workspace state
previous_workspace_name = None
previous_workspace_data = None

# Add a global variable to track the currently selected conversation
selected_conversation = None

def signal_handler(sig, frame):
    global running
    logger.info("Shutting down messaging client...")
    running = False
    sio.disconnect()
    try:
        driver.quit()
    except Exception:
        pass
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

@sio.event(namespace="/messaging")
def connect():
    logger.info("Connected to WebSocket server.")

@sio.event(namespace="/messaging")
def connect_error(data):
    logger.error("Connection failed:", data)

@sio.event(namespace="/messaging")
def disconnect():
    logger.info("Disconnected from WebSocket server.")

def initialize_selenium():
    chrome_options = Options()
    chrome_options.add_experimental_option("debuggerAddress", "localhost:9222")
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def is_dm(driver):
    """
    Determines if the current chat is a DM or a channel based on the aria-label attribute.
    """
    try:
        main_content = driver.find_element(By.CSS_SELECTOR, 'div.p-view_contents.p-view_contents--primary')
        aria_label = main_content.get_attribute('aria-label')
        if aria_label:
            if "Conversation with" in aria_label:
                return True
            elif "Channel" in aria_label:
                return False
        return False
    except NoSuchElementException:
        return False

def is_thread_open(driver):
    """
    Determines if a thread is open by checking for the presence of the thread pane.
    """
    try:
        # Adjust the selector based on Slack's current HTML structure
        thread_pane = driver.find_element(By.CSS_SELECTOR, 'div.p-threads_view')
        if thread_pane.is_displayed():
            return True
        else:
            return False
    except NoSuchElementException:
        return False

def derive_salt(sender_name, pepper):
    """
    Derives a deterministic salt based on the sender's name and a secret pepper.
    """
    return hmac.new(
        key=pepper.encode('utf-8'),
        msg=sender_name.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()[:16]  # Use the first 16 bytes as the salt

def hash_sender_name(sender_name, salt, pepper):
    """
    Hashes the sender's name using SHA-256 with a derived salt and pepper.
    """
    hasher = hashlib.sha256()
    hasher.update(sender_name.encode('utf-8') + salt + pepper.encode('utf-8'))
    return hasher.hexdigest()

def extract_sender_name(message):
    sender_name = "Unknown"

    possible_selectors = [
        "a.c-message__sender_link",
        "button.c-message__sender_button",
        "span.c-message__sender",
        "span.offscreen[data-qa^='aria-labelledby']",
    ]

    for selector in possible_selectors:
        try:
            sender_element = message.find_element(By.CSS_SELECTOR, selector)
            sender_name = sender_element.text.strip()
            break
        except NoSuchElementException:
            continue

    sender_name = normalize_sender_name(sender_name)

    if sender_name == "Unknown":
        logger.warning("Could not extract sender name for a message.")

    return sender_name

def normalize_sender_name(sender_name):
    # Remove leading/trailing whitespace
    sender_name = sender_name.strip()

    # Convert to lowercase
    sender_name = sender_name.lower()

    # Replace multiple spaces with a single space
    sender_name = ' '.join(sender_name.split())

    # Remove zero-width spaces and other invisible characters if needed
    # sender_name = sender_name.replace('\u200b', '')

    return sender_name


def extract_message_text(message):
    try:
        message_text_element = message.find_element(By.CSS_SELECTOR, "div.c-message_kit__blocks")
        message_text = message_text_element.text.strip()
    except NoSuchElementException:
        message_text = ""
    return message_text

def extract_timestamp(message_id):
    try:
        ts_float = float(message_id)
        timestamp = int(ts_float * 1000)
    except ValueError:
        timestamp = None
    return timestamp

def hash_sender_name_with_salt(sender_name):
    # Derive the salt for this sender
    salt = derive_salt(sender_name, PEPPER)
    # Hash the sender's name
    hashed_sender_name = hash_sender_name(sender_name, salt, PEPPER)
    return hashed_sender_name

def find_last_message_from_me(driver):
    """
    Finds the last message sent by 'me' (pearl) in Slack.
    Returns:
        last_message_from_me_ts_float: The timestamp (as float) of the last message sent by 'me'.
    """
    try:
        # Locate message elements
        messages = driver.find_elements(By.CSS_SELECTOR, "div.c-message_kit__background")

        # Go through messages from newest to oldest
        for message in reversed(messages):
            logger.info(f"Message: {extract_message_text(message)}")
            # Extract sender name
            sender_name = extract_sender_name(message)
            logger.info(f"Sender name: {sender_name}")
            # Check if the sender is 'me'
            if "pearl" in sender_name.lower():
                # Extract message ID (timestamp)
                try:
                    timestamp_element = message.find_element(By.CSS_SELECTOR, "a.c-timestamp")
                    message_id = timestamp_element.get_attribute("data-ts")
                    message_ts_float = float(message_id)
                except (NoSuchElementException, ValueError):
                    message_id = None
                    message_ts_float = None

                logger.info(f"Found last message from 'me' with ID: {message_id}")
                return message_ts_float

        # If no message from 'me' is found
        logger.info("No previous message from 'me' found.")
        return None

    except Exception as e:
        logger.exception("Error finding last message from 'me'.")
        return None

def find_last_message_from_me_in_thread(driver):
    """
    Finds the last message sent by 'me' (pearl) in the current thread.
    Returns:
        last_message_from_me_ts_float: The timestamp (as float) of the last message sent by 'me' in the thread.
    """
    try:
        # Locate message elements in the thread
        messages = driver.find_elements(By.CSS_SELECTOR, "div.c-virtual_list__item--thread div.c-message_kit__background")

        # Go through messages from newest to oldest
        for message in reversed(messages):
            # Extract sender name
            sender_name = extract_sender_name(message)

            # Check if the sender is 'me'
            if "pearl" in sender_name.lower():
                # Extract message ID (timestamp)
                try:
                    timestamp_element = message.find_element(By.CSS_SELECTOR, "a.c-timestamp")
                    message_id = timestamp_element.get_attribute("data-ts")
                    message_ts_float = float(message_id)
                except (NoSuchElementException, ValueError):
                    message_id = None
                    message_ts_float = None

                logger.info(f"Found last message from 'me' in thread with ID: {message_id}")
                return message_ts_float

        # If no message from 'me' is found in the thread
        logger.info("No previous message from 'me' found in thread.")
        return None

    except Exception as e:
        logger.exception("Error finding last message from 'me' in thread.")
        return None

def collect_messages_from_elements(messages, last_message_from_me_ts_float, last_message_from_me_ts_float_in_thread=None):
    """
    Collect messages sent after the last message from 'me' (or up to last message from 'me' in thread), based on timestamps.
    """
    messages_list = []

    # Go through messages from oldest to newest
    for message in messages:
        # Extract message ID (timestamp)
        try:
            timestamp_element = message.find_element(By.CSS_SELECTOR, "a.c-timestamp")
            message_id = timestamp_element.get_attribute("data-ts")
            message_ts_float = float(message_id)
        except (NoSuchElementException, ValueError):
            message_id = str(uuid.uuid4())  # Fallback to UUID if timestamp not found
            message_ts_float = None

        # For threads, stop collecting if message_ts_float >= last_message_from_me_ts_float_in_thread
        if last_message_from_me_ts_float_in_thread is not None and message_ts_float is not None:
            if message_ts_float >= last_message_from_me_ts_float_in_thread:
                break  # Stop collecting further messages

        # For DMs, skip messages <= last_message_from_me_ts_float
        if last_message_from_me_ts_float is not None and message_ts_float is not None:
            if message_ts_float <= last_message_from_me_ts_float:
                continue

        # Extract sender name
        sender_name = extract_sender_name(message)
        # Skip messages sent by 'me' to prevent feedback loops
        if "pearl" in sender_name.lower():
            continue
        # Extract message content
        message_text = extract_message_text(message)
        # Extract timestamp
        timestamp = extract_timestamp(message_id)
        # Hash the sender's name
        hashed_sender_name = hash_sender_name_with_salt(sender_name)
        # Add message to the list
        messages_list.append({
            'message_id': message_id,
            'content': message_text,
            'timestamp': timestamp,
            'hashed_sender_name': hashed_sender_name,
        })

    return messages_list

def collect_messages_after(driver, last_message_from_me_ts_float):
    """
    Collects messages based on the current context: DM, channel, or thread.
    """
    try:
        # Determine context
        in_dm = is_dm(driver)
        thread_open = is_thread_open(driver)
        messages_list = []

        if thread_open:
            logger.info("Thread is open. Collecting messages in thread up to last message from 'me'.")
            # Find the last message from 'me' in the thread
            last_message_from_me_in_thread_ts_float = find_last_message_from_me_in_thread(driver)

            # Collect messages in the thread
            messages = driver.find_elements(By.CSS_SELECTOR, "div.c-virtual_list__item--thread div.c-message_kit__background")

            # Use the timestamp of the last message from 'me' in the thread
            messages_list = collect_messages_from_elements(messages, None, last_message_from_me_in_thread_ts_float)
        elif in_dm:
            if last_message_from_me_ts_float is None:
                logger.info("No previous message from 'me' found in DM. Not collecting any messages.")
                messages_list = []
            else:
                logger.info("In a DM. Collecting messages sent after last message from 'me'.")
                # Collect messages in the DM
                messages = driver.find_elements(By.CSS_SELECTOR, "div.c-message_kit__background")
                messages_list = collect_messages_from_elements(messages, last_message_from_me_ts_float)
        else:
            if last_message_from_me_ts_float is None:
                logger.info("No previous message from 'me' found in channel. Not collecting any messages.")
                messages_list = []
            else:
                logger.info("In a channel. Collecting messages sent after last message from 'me'.")
                # Collect messages in the channel
                messages = driver.find_elements(By.CSS_SELECTOR, "div.c-message_kit__background")
                messages_list = collect_messages_from_elements(messages, last_message_from_me_ts_float)

        return messages_list

    except Exception as e:
        logger.exception("Error collecting messages.")
        return []

def detect_new_messages(driver, last_processed_ts_float):
    """
    Detects new messages based on the current context: DM, channel, or thread.
    """
    try:
        # Determine context
        in_dm = is_dm(driver)
        thread_open = is_thread_open(driver)
        new_messages = []

        if thread_open:
            logger.info("Thread is open. Detecting new messages in thread up to last message from 'me'.")
            # Find the last message from 'me' in the thread
            last_message_from_me_in_thread_ts_float = find_last_message_from_me_in_thread(driver)

            # Collect messages in the thread
            messages = driver.find_elements(By.CSS_SELECTOR, "div.c-virtual_list__item--thread div.c-message_kit__background")

            # Use the timestamp of the last message from 'me' in the thread
            new_messages = detect_new_messages_from_elements(messages, last_processed_ts_float, last_message_from_me_in_thread_ts_float)
        elif in_dm:
            if last_processed_ts_float is None:
                logger.info("No previous message from 'me' found in DM. Not detecting new messages.")
                new_messages = []
            else:
                logger.info("In a DM. Detecting new messages.")
                # Collect messages in the DM
                messages = driver.find_elements(By.CSS_SELECTOR, "div.c-message_kit__background")
                new_messages = detect_new_messages_from_elements(messages, last_processed_ts_float)
        else:
            if last_processed_ts_float is None:
                logger.info("No previous message from 'me' found in channel. Not detecting new messages.")
                new_messages = []
            else:
                logger.info("In a channel. Detecting new messages.")
                # Collect messages in the channel
                messages = driver.find_elements(By.CSS_SELECTOR, "div.c-message_kit__background")
                new_messages = detect_new_messages_from_elements(messages, last_processed_ts_float)

        return new_messages

    except Exception as e:
        logger.exception("Error detecting new messages.")
        return []


def detect_new_messages_from_elements(messages, last_processed_ts_float, last_message_from_me_ts_float_in_thread=None):
    """
    Detects new messages from given message elements after last_processed_ts_float and before last_message_from_me_ts_float_in_thread.
    """
    new_messages = []

    # Go through messages from oldest to newest
    for message in messages:
        # Extract message ID (timestamp)
        try:
            timestamp_element = message.find_element(By.CSS_SELECTOR, "a.c-timestamp")
            message_id = timestamp_element.get_attribute("data-ts")
            message_ts_float = float(message_id)
        except (NoSuchElementException, ValueError):
            message_id = str(uuid.uuid4())  # Fallback to UUID if timestamp not found
            message_ts_float = None

        # For threads, stop collecting if message_ts_float >= last_message_from_me_ts_float_in_thread
        if last_message_from_me_ts_float_in_thread is not None and message_ts_float is not None:
            if message_ts_float >= last_message_from_me_ts_float_in_thread:
                break  # Stop collecting further messages

        # Skip messages before or equal to last_processed_ts_float
        if last_processed_ts_float is not None and message_ts_float is not None:
            if message_ts_float <= last_processed_ts_float:
                continue

        # Extract sender name
        sender_name = extract_sender_name(message)
        # Skip messages sent by 'me' to prevent feedback loops
        if "pearl" in sender_name.lower():
            continue
        # Extract message content
        message_text = extract_message_text(message)
        # Extract timestamp
        timestamp = extract_timestamp(message_id)
        # Hash the sender's name
        hashed_sender_name = hash_sender_name_with_salt(sender_name)
        # Add message to the list
        new_messages.append({
            'message_id': message_id,
            'content': message_text,
            'timestamp': timestamp,
            'hashed_sender_name': hashed_sender_name,
        })

    # Return new messages sorted by timestamp
    new_messages.sort(key=lambda x: float(x['message_id']))
    return new_messages


def send_message_via_websocket(content, timestamp, hashed_sender_name):
    """
    Sends the new message to the back end via WebSocket.
    """
    try:
        # Send the content, timestamp, and hashed sender's name
        sio.emit(
            "newMessage",
            {
                "content": content,
                "timestamp": timestamp,
                "user_id": USER_ID,
                "hashed_sender_name": hashed_sender_name,
            },
            namespace="/messaging",
        )
        logger.info(f'Sent message via WebSocket: "{content}" at {timestamp}')
    except Exception as e:
        logger.exception("Failed to send message via WebSocket.")

def send_response_to_slack(response):
    """
    Uses Selenium to send the selected response to Slack.
    """
    try:
        # Wait for the message input to be available
        wait = WebDriverWait(driver, 10)

        # Check if a thread is open by looking for the thread input box
        try:
            # Locate the thread input box
            message_input = wait.until(
                EC.presence_of_element_located(
                    (
                        By.CSS_SELECTOR,
                        'div.p-threads_footer__input div[data-qa="message_input"] div.ql-editor',
                    )
                )
            )
            logger.info("Thread input box found. Sending response to thread.")
        except (TimeoutException, NoSuchElementException):
            # If thread input box is not found, use the main message input box
            message_input = wait.until(
                EC.presence_of_element_located(
                    (
                        By.CSS_SELECTOR,
                        'div[data-qa="message_input"] div.ql-editor',
                    )
                )
            )
            logger.info("Thread input box not found. Sending response to main chat.")

        # Click to focus
        message_input.click()

        # Type the response
        message_input.send_keys(response)

        # Manually trigger input events (if necessary)
        driver.execute_script(
            "arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", message_input
        )
        driver.execute_script(
            "arguments[0].dispatchEvent(new Event('keyup', { bubbles: true }));", message_input
        )

        # Wait a moment for the input to be processed
        time.sleep(0.5)

        # Simulate pressing Enter to send the message
        message_input.send_keys(Keys.ENTER)

        logger.info(f"Sent response to Slack: {response}")

    except NoSuchElementException as e:
        logger.exception("Failed to locate Slack message input.")
    except ElementNotInteractableException as e:
        logger.exception("Slack message input not interactable.")
    except Exception as e:
        logger.exception("Failed to send response to Slack.")

@sio.on("sendSelectedResponse", namespace="/messaging")
def on_send_selected_response(data):
    selected_response = data.get("selected_response")
    if selected_response:
        logger.info(f"Received selected response: {selected_response}")
        send_response_to_slack(selected_response)
    else:
        logger.error("Received sendSelectedResponse event without selected_response")

def get_current_chat_id(driver):
    """
    Returns a unique identifier for the current chat, based on the URL.
    """
    try:
        current_url = driver.current_url
        parsed_url = urllib.parse.urlparse(current_url)
        channel_id = urllib.parse.parse_qs(parsed_url.query).get('channel', [None])[0]

        if channel_id:
            logger.info(f"Current chat ID: {channel_id}")
            return channel_id
        else:
            # Fallback: Use the path
            path = parsed_url.path
            if path:
                logger.info(f"Current chat path: {path}")
                return path
            else:
                logger.warning("Unable to determine current chat ID.")
                return None
    except Exception as e:
        logger.exception("Error getting current chat ID.")
        return None

def notify_chat_changed(new_chat_id):
    """
    Emits a 'chatChanged' event to the back-end via WebSocket.
    Args:
        new_chat_id (str): The identifier of the new chat.
    """
    try:
        # Emit the 'chatChanged' event to the backend's '/messaging' namespace
        sio.emit(
            "chatChanged",
            {"new_chat_id": new_chat_id},
            namespace="/messaging",
        )
        logger.info(f"Emitted 'chatChanged' event with new_chat_id: {new_chat_id}")
    except Exception as e:
        logger.exception("Failed to emit 'chatChanged' event.")

def process_chat_change(driver):
    """
    Handles chat/thread state changes by collecting and processing new messages.
    Returns the new state values.
    """
    # Find last message from 'me'
    last_message_from_me_ts_float = find_last_message_from_me(driver)
    
    if last_message_from_me_ts_float is None:
        # If no previous messages from me, get the last 5 messages
        try:
            messages = driver.find_elements(By.CSS_SELECTOR, "div.c-message_kit__background")
            messages_to_process = []
            
            # Take up to last 5 messages, excluding messages from 'me'
            for message in reversed(messages[-5:] if len(messages) > 5 else messages):
                sender_name = extract_sender_name(message)
                if "pearl" not in sender_name.lower():
                    timestamp_element = message.find_element(By.CSS_SELECTOR, "a.c-timestamp")
                    message_id = timestamp_element.get_attribute("data-ts")
                    content = extract_message_text(message)
                    timestamp = extract_timestamp(message_id)
                    hashed_sender_name = hash_sender_name_with_salt(sender_name)
                    
                    messages_to_process.insert(0, {
                        'message_id': message_id,
                        'content': content,
                        'timestamp': timestamp,
                        'hashed_sender_name': hashed_sender_name
                    })
        except Exception as e:
            logger.exception("Error collecting last 5 messages")
            messages_to_process = []
    else:
        # Collect messages after last message from 'me'
        messages_to_process = collect_messages_after(driver, last_message_from_me_ts_float)
    
    # Update last_processed_ts_float if we found messages
    last_processed_ts_float = (
        float(messages_to_process[-1]['message_id']) if messages_to_process 
        else last_message_from_me_ts_float
    )
        
    # Process all messages
    for message in messages_to_process:
        send_message_via_websocket(
            message['content'], 
            message['timestamp'], 
            message['hashed_sender_name']
        )
        
    return last_message_from_me_ts_float, last_processed_ts_float

def get_workspace_data():
    workspace_data = {
        'name': '',
        'channels': [],
        'privateChannels': [],
        'dms': [],
        'groupDms': []
    }
    
    try:
        # Get workspace name
        workspace_header = driver.find_element(By.CSS_SELECTOR, "button[data-qa='workspace_actions_button']")
        workspace_data['name'] = workspace_header.find_element(By.CLASS_NAME, "p-ia4_home_header_menu__team_name").text.strip()
        
        # Use our helper functions instead of duplicating code
        workspace_data['channels'] = get_channels(driver)
        workspace_data['dms'] = get_dms(driver)
        workspace_data['privateChannels'] = get_private_channels(driver)
        workspace_data['groupDms'] = get_group_dms(driver)

    except Exception as e:
        logger.error(f"Error getting workspace data: {e}")
        
    return workspace_data

def emit_workspace_update():
    """
    Sends current workspace data to the front-end.
    """
    try:
        workspace_data = get_workspace_data()
        if workspace_data:
            sio.emit(
                "workspaceUpdate",
                workspace_data,
                namespace="/messaging"
            )
            logger.info(f"Sent workspace update: {workspace_data}")
    except Exception as e:
        logger.exception("Error sending workspace update")

def get_current_workspace_name(driver):
    """Get current workspace name from Slack header."""
    try:
        workspace_header = driver.find_element(By.CSS_SELECTOR, "button[data-qa='workspace_actions_button']")
        return workspace_header.find_element(By.CLASS_NAME, "p-ia4_home_header_menu__team_name").text.strip()
    except:
        return None

def get_channels(driver):
    """Get list of channels from Slack."""
    try:
        channels = []
        channel_elements = driver.find_elements(By.CSS_SELECTOR, "div.p-channel_sidebar__channel[data-qa-channel-sidebar-channel-type='channel']")
        for element in channel_elements:
            name = element.find_element(By.CLASS_NAME, "p-channel_sidebar__name").text.strip()
            channel_id = element.get_attribute('data-qa-channel-sidebar-channel-id')
            channels.append({'id': channel_id, 'name': name, 'type': 'channel'})
        return channels
    except Exception as e:
        logger.error(f"Error getting channels: {e}")
        return []

def get_dms(driver):
    """Get list of direct messages."""
    try:
        dms = []
        dm_elements = driver.find_elements(By.CSS_SELECTOR, "div.p-channel_sidebar__channel[data-qa-channel-sidebar-channel-type='im']")
        for element in dm_elements:
            name = element.find_element(By.CLASS_NAME, "p-channel_sidebar__name").text.strip()
            dm_id = element.get_attribute('data-qa-channel-sidebar-channel-id')
            dms.append({'id': dm_id, 'name': name, 'type': 'dm'})
        return dms
    except Exception as e:
        logger.error(f"Error getting DMs: {e}")
        return []

def get_private_channels(driver):
    """Get list of private channels."""
    try:
        private_channels = []
        private_elements = driver.find_elements(By.CSS_SELECTOR, "div.p-channel_sidebar__channel[data-qa-channel-sidebar-channel-type='private']")
        for element in private_elements:
            name = element.find_element(By.CLASS_NAME, "p-channel_sidebar__name").text.strip()
            channel_id = element.get_attribute('data-qa-channel-sidebar-channel-id')
            private_channels.append({'id': channel_id, 'name': name, 'type': 'private'})
        return private_channels
    except Exception as e:
        logger.error(f"Error getting private channels: {e}")
        return []

def get_group_dms(driver):
    """Get list of group DMs."""
    try:
        group_dms = []
        group_elements = driver.find_elements(By.CSS_SELECTOR, "div.p-channel_sidebar__channel[data-qa-channel-sidebar-channel-type='mpim']")
        for element in group_elements:
            name = element.find_element(By.CLASS_NAME, "p-channel_sidebar__name").text.strip()
            dm_id = element.get_attribute('data-qa-channel-sidebar-channel-id')
            group_dms.append({'id': dm_id, 'name': name, 'type': 'group'})
        return group_dms
    except Exception as e:
        logger.error(f"Error getting group DMs: {e}")
        return []

def get_user_input(prompt: str) -> str:
    """Get user input with proper error handling."""
    try:
        return input(prompt).strip().lower()
    except EOFError:
        return 'n'

def wait_for_workspace():
    """Wait for workspace data to be available."""
    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            current_workspace_name = get_current_workspace_name(driver)
            if current_workspace_name:
                logger.info(f"Found workspace name: {current_workspace_name}")
                workspace_data = get_workspace_data()
                if workspace_data:
                    logger.info(f"Got workspace data: {workspace_data}")
                    return current_workspace_name, workspace_data
        except Exception as e:
            logger.error(f"Attempt {attempt + 1}: Error getting workspace data: {e}")
        time.sleep(2)
    return None, None

def collect_workspaces():
    """Collect workspace data interactively."""
    workspaces = {}
    
    while True:
        # Get initial workspace data
        current_workspace_name, workspace_data = wait_for_workspace()
        
        if current_workspace_name and workspace_data:
            logger.info(f"Found workspace: {current_workspace_name}")
            workspaces[current_workspace_name] = workspace_data
            
            # Emit workspace data to frontend
            sio.emit('workspaceUpdate', workspace_data, namespace='/messaging')
            
            # Ask user if they want to add another workspace
            response = get_user_input("\nWould you like to add another workspace? (y/n): ")
            
            if response != 'y':
                logger.info("Workspace collection completed.")
                break
            else:
                logger.info("Please switch to another workspace in Chrome...")
                time.sleep(15)  # Give user time to switch workspaces
        else:
            logger.error("Failed to get workspace data")
            if get_user_input("Would you like to retry? (y/n): ") != 'y':
                break

    return workspaces


def messaging_client():
    global driver, selected_conversation

    try:
        # Connect to WebSocket server
        sio.connect(
            WEBSOCKET_SERVER_URL,
            namespaces=["/messaging"],
            transports=["websocket"],
            socketio_path="/socket.io"
        )
        logger.info(f"Connecting to WebSocket server: {WEBSOCKET_SERVER_URL}")
    except Exception as e:
        logger.exception("Failed to connect to WebSocket server.")
        sys.exit(1)

    # Initialize Selenium WebDriver
    driver = initialize_selenium()
    logger.info("Selenium WebDriver initialized and connected to Chrome.")

    # Collect all workspaces interactively
    logger.info("Starting workspace collection...")
    workspaces = collect_workspaces()
    
    if not workspaces:
        logger.error("No workspaces collected. Exiting...")
        sys.exit(1)
    
    logger.info(f"Collected {len(workspaces)} workspace(s)")

    # Main loop - only runs when conversation is selected
    while running:
        try:
            # Skip if no conversation is selected
            if not selected_conversation:
                logger.info("Waiting for conversation selection...")
                time.sleep(POLL_INTERVAL)
                continue
                
            logger.info(f"Monitoring conversation: {selected_conversation['name']}")
            
            # Process messages in the selected conversation
            last_message_from_me_ts_float, last_processed_ts_float = process_chat_change(driver)
            
            # Detect and process new messages
            new_messages = detect_new_messages(driver, last_processed_ts_float)
            
            # Send any new messages via WebSocket
            for message in new_messages:
                send_message_via_websocket(
                    message['content'],
                    message['timestamp'],
                    message['hashed_sender_name']
                )
                last_processed_ts_float = float(message['message_id'])

        except Exception as e:
            logger.exception("Error in main loop.")

        time.sleep(POLL_INTERVAL)

    # Add these socket event handlers at the module level, before messaging_client()
@sio.on('selectConversation', namespace='/messaging')
def on_select_conversation(data):
    """Handle conversation selection from frontend."""
    global selected_conversation
    try:
        logger.info("=== Conversation Selection Flow Start ===")
        logger.info(f"Received selectConversation event with data: {data}")
        
        conversation_id = data.get('id')
        conversation_name = data.get('name')  # Add name to the data sent from frontend
        conversation_type = data.get('type')
        logger.info(f"Parsed conversation details - ID: {conversation_id}, Name: {conversation_name}, Type: {conversation_type}")
        
        # Set the selected conversation
        selected_conversation = {
            'id': conversation_id,
            'name': conversation_name,
            'type': conversation_type
        }
        
        # Click the conversation in Slack
        logger.info(f"Attempting to click conversation: {conversation_name}")
        click_conversation_by_name(conversation_name, conversation_type)
        
        # Get initial messages after switching
        logger.info("Getting initial messages...")
        last_message_from_me_ts_float, last_processed_ts_float = process_chat_change(driver)
        
        logger.info("=== Conversation Selection Flow Complete ===")
    except Exception as e:
        logger.error("=== Conversation Selection Flow Failed ===")
        logger.error(f"Error in conversation selection: {e}")
        selected_conversation = None
        raise

def click_conversation_by_name(name: str, type_attr: str):
    """Click on conversation by matching its name."""
    global driver
    try:
        logger.info(f"Looking for conversation: {name} of type {type_attr}")
        
        # Map type to Slack's attribute
        type_mapping = {
            'channel': 'channel',
            'dm': 'im',
            'private': 'private',
            'group': 'mpim'
        }
        slack_type = type_mapping.get(type_attr)
        
        # Find all elements of this type
        elements = driver.find_elements(By.CSS_SELECTOR, 
            f"div.p-channel_sidebar__channel[data-qa-channel-sidebar-channel-type='{slack_type}']")
        
        # Find element with matching name
        for element in elements:
            element_name = element.find_element(By.CLASS_NAME, "p-channel_sidebar__name").text.strip()
            if element_name.lower() == name.lower():
                logger.info(f"Found matching conversation: {name}")
                driver.execute_script("arguments[0].click();", element)
                time.sleep(1)  # Wait for conversation to load
                return
                
        raise Exception(f"Could not find conversation: {name}")
        
    except Exception as e:
        logger.error(f"Error clicking conversation: {e}")
        raise

if __name__ == "__main__":
    try:
        # Start the messaging client
        messaging_client()
    except Exception as e:
        logger.exception("Failed to start messaging client.")

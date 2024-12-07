import time
# import socketio  # Commented out WebSocket communication
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
import urllib.parse  # For parsing URLs

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configuration
# WEBSOCKET_SERVER_URL = os.getenv("WEBSOCKET_SERVER_URL", "http://localhost:3000")
USER_ID = os.getenv("USER_ID", "pearl@easyspeak-aac.com")  # Replace with your actual user ID or email
POLL_INTERVAL = 5  # Seconds between polling requests

# Commenting out Socket.IO initialization
# sio = socketio.Client()

# Flag to control the main loop
running = True

def signal_handler(sig, frame):
    global running
    logger.info("Shutting down messaging client...")
    running = False
    try:
        driver.quit()
    except Exception:
        pass
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Commenting out Socket.IO events
# @sio.event(namespace="/messaging")
# def connect():
#     logger.info("Connected to WebSocket server.")

# @sio.event(namespace="/messaging")
# def connect_error(data):
#     logger.error("Connection failed:", data)

# @sio.event(namespace="/messaging")
# def disconnect():
#     logger.info("Disconnected from WebSocket server.")

def initialize_selenium():
    chrome_options = Options()
    chrome_options.add_argument("--disable-notifications")
    chrome_options.add_argument("--start-maximized")
    
    # Add the debugger address line - this is key:
    chrome_options.add_experimental_option("debuggerAddress", "localhost:9222")
    
    # Now create your driver:
    driver = webdriver.Chrome(options=chrome_options)
    return driver


def extract_sender_name_instagram(message):
    try:
        sender_element = message.find_element(By.XPATH, './/h5/span')
        sender_name = sender_element.text.strip()
    except NoSuchElementException:
        sender_name = "You"
    return sender_name

def extract_message_text_instagram(message):
    try:
        text_elements = message.find_elements(By.XPATH, './/*[@dir="auto" and not(@role)]')
        message_text = " ".join(el.text.strip() for el in text_elements if el.text.strip())
    except NoSuchElementException:
        message_text = ""
    return message_text

def extract_timestamp_instagram(message):
    return None

def find_last_message_from_me_instagram(driver):
    try:
        messages = driver.find_elements(By.CSS_SELECTOR, "div[role='gridcell']")
        for message in reversed(messages):
            sender_name = extract_sender_name_instagram(message)
            # Replace 'your_username' with your actual Instagram username
            if "pearlykathleen" in sender_name.lower():
                timestamp = extract_timestamp_instagram(message)
                logger.info(f"Found last message from 'me' with timestamp: {timestamp}")
                return timestamp
        logger.info("No previous message from 'me' found.")
        return None
    except Exception as e:
        logger.exception("Error finding last message from 'me'.")
        return None

def collect_new_messages_instagram(driver, last_processed_ts=None):
    try:
        messages = driver.find_elements(By.CSS_SELECTOR, "div[role='gridcell']")
        new_messages = []
        for message in messages:
            timestamp = extract_timestamp_instagram(message)
            if last_processed_ts and timestamp and timestamp <= last_processed_ts:
                continue

            sender_name = extract_sender_name_instagram(message)
            # Replace 'your_username' with your actual username
            if "pearlykathleen" in sender_name.lower():
                continue

            content = extract_message_text_instagram(message)
            if not content:
                continue

            new_messages.append({
                'timestamp': timestamp,
                'sender_name': sender_name,
                'content': content,
            })

        return new_messages
    except Exception as e:
        logger.exception("Error collecting new messages.")
        return []

def send_message_via_print(sender_name, content, timestamp):
    """
    Instead of sending message via WebSocket, just print it.
    """
    logger.info(f'New message received: "{content}" from {sender_name} at {timestamp}')

# Commenting out Socket.IO response event
# @sio.on("sendSelectedResponse", namespace="/messaging")
# def on_send_selected_response(data):
#     selected_response = data.get("selected_response")
#     if selected_response:
#         logger.info(f"Received selected response: {selected_response}")
#         send_response_to_instagram(selected_response)
#     else:
#         logger.error("Received sendSelectedResponse event without selected_response")

def send_response_to_instagram(response):
    try:
        wait = WebDriverWait(driver, 10)
        message_input = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//textarea[contains(@aria-label,'Message')]")
            )
        )
        message_input.click()
        message_input.send_keys(response)
        message_input.send_keys(Keys.ENTER)
        logger.info(f"Sent response to Instagram: {response}")
    except NoSuchElementException:
        logger.exception("Failed to locate Instagram message input.")
    except ElementNotInteractableException:
        logger.exception("Instagram message input not interactable.")
    except Exception as e:
        logger.exception("Failed to send response to Instagram.")

def get_current_chat_id_instagram(driver):
    try:
        current_url = driver.current_url
        logger.info(f"Current URL: {current_url}")
        parsed_url = urllib.parse.urlparse(current_url)
        parts = parsed_url.path.strip('/').split('/')
        if len(parts) >= 3 and parts[0] == 'direct' and parts[1] == 't':
            chat_id = parts[2]
            logger.info(f"Current chat ID: {chat_id}")
            return chat_id
        else:
            logger.warning("Unable to determine current chat ID from URL.")
            return None
    except Exception as e:
        logger.exception("Error getting current chat ID.")
        return None


def notify_chat_changed_instagram(new_chat_id):
    # Instead of socket emit, just log
    logger.info(f"Chat changed to: {new_chat_id}")

def messaging_client_instagram():
    global driver

    # Commenting out WebSocket connection
    # try:
    #     sio.connect(f"{WEBSOCKET_SERVER_URL}/messaging", namespaces=["/messaging"])
    #     logger.info(f"Connecting to WebSocket server: {WEBSOCKET_SERVER_URL}/messaging")
    # except Exception as e:
    #     logger.exception("Failed to connect to WebSocket server.")
    #     sys.exit(1)

    driver = initialize_selenium()
    logger.info("Selenium WebDriver initialized.")

    previous_chat_id = get_current_chat_id_instagram(driver)
    last_processed_ts = find_last_message_from_me_instagram(driver)

    messages_to_process = collect_new_messages_instagram(driver, last_processed_ts)
    for message in messages_to_process:
        sender_name = message['sender_name']
        content = message['content']
        timestamp = message['timestamp']
        logger.info(f'Processing message: "{content}" from {sender_name} at {timestamp}')
        send_message_via_print(sender_name, content, timestamp)
        last_processed_ts = timestamp

    while running:
        try:
            current_chat_id = get_current_chat_id_instagram(driver)
            if current_chat_id != previous_chat_id:
                logger.info("Chat has changed. Resetting state.")
                previous_chat_id = current_chat_id
                notify_chat_changed_instagram(current_chat_id)
                last_processed_ts = find_last_message_from_me_instagram(driver)
                messages_to_process = collect_new_messages_instagram(driver, last_processed_ts)
                for message in messages_to_process:
                    sender_name = message['sender_name']
                    content = message['content']
                    timestamp = message['timestamp']
                    logger.info(f'Processing message: "{content}" from {sender_name} at {timestamp}')
                    send_message_via_print(sender_name, content, timestamp)
                    last_processed_ts = timestamp
            else:
                new_messages = collect_new_messages_instagram(driver, last_processed_ts)
                if new_messages:
                    for message in new_messages:
                        sender_name = message['sender_name']
                        content = message['content']
                        timestamp = message['timestamp']
                        logger.info(f'New message detected: "{content}" from {sender_name} at {timestamp}')
                        send_message_via_print(sender_name, content, timestamp)
                        last_processed_ts = timestamp
                else:
                    logger.debug("No new messages detected.")
            time.sleep(POLL_INTERVAL)

        except Exception as e:
            logger.exception("Error in main loop.")

if __name__ == "__main__":
    try:
        messaging_client_instagram()
    except Exception as e:
        logger.exception("Failed to start messaging client.")

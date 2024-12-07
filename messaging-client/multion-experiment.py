from multion.client import MultiOn
import os
from dotenv import load_dotenv

load_dotenv()
multion_api_key = os.getenv("MULTION_API_KEY")

client = MultiOn(
    api_key=multion_api_key
)

create_response = client.sessions.create(
    url="https://news.ycombinator.com/",
    use_proxy=True
)

session_id = create_response.session_id

retrieve_response = client.retrieve(
    session_id=session_id,
    cmd="Get all posts on Hackernews with title, creator, time created, points as a number, number of comments as a number, and the post URL.",
    fields=["title", "creator", "time", "points", "comments", "url"]
)

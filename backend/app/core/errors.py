class SeedPending(Exception):
    """The player's rating seed is still being fetched"""

class ChartNotFoundForRating(Exception):
    """No Charts were found within the player's search rating."""

class RatingNotFoundForChart(Exception):
    def __init__(self, chart_id: str):
        super().__init__(f"Rating not found for chart {chart_id}.")

class ChartNotFound(Exception):
    def __init__(self, chart_id: str):
        super().__init__(f"Chart {chart_id} not found.")

class RollbackError(Exception):
    """Generic rollback error"""

class PlayerNotFound(RollbackError):
    def __init__(self, user_id: int):
        super().__init__(f"User {user_id} not found.")

class PlayerHasNoTachiKey(Exception):
    def __init__(self, user_id:int):
        super().__init__(f" User {user_id} has not set a Bokutachi key yet.")

class RatingNotFoundForPlayer(Exception):
    def __init__(self, user_id: int):
        super().__init__(f"Rating not found for User {user_id}.")

class MatchNotFound(RollbackError):
    def __init__(self, match_id: int):
        super().__init__(f"Match {match_id} not found.")

class MatchNotRollbackable(RollbackError):
    def __init__(self, match_id: int):
        super().__init__(f"Match {match_id} not roll backable.")

class InvalidTables(Exception):
    def __init__(self):
        super().__init__("A table input does not exist!")

class GenericRatingNotFound(RollbackError):
    """A player or chart rating was not found"""

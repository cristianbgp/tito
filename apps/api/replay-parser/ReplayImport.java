package opendota;

import com.google.gson.*;
import java.io.*;
import java.util.*;
import skadistats.clarity.processor.reader.OnMessage;
import skadistats.clarity.processor.runner.Context;
import skadistats.clarity.processor.runner.SimpleRunner;
import skadistats.clarity.source.InputStreamSource;
import skadistats.clarity.wire.shared.demo.proto.Demo.CDemoFileInfo;
import skadistats.clarity.wire.dota.s2.proto.DOTAS2GcMessagesCommon.CMsgDOTAMatch;

/** Local stdin-free CLI adapter for the pinned OpenDota parser. Never starts its HTTP server. */
public class ReplayImport {
    public static class Metadata {
        CDemoFileInfo file;
        CMsgDOTAMatch match;
        @OnMessage(CDemoFileInfo.class)
        public void onFile(Context ctx, CDemoFileInfo message) { file = message; }
        @OnMessage(CMsgDOTAMatch.class)
        public void onMatch(Context ctx, CMsgDOTAMatch message) { match = message; }
    }
    static void put(JsonObject object, String key, Number value) {
        if (value == null) object.add(key, JsonNull.INSTANCE); else object.addProperty(key, value);
    }
    public static void main(String[] args) {
        try { run(args); }
        catch (SecurityException error) { System.err.println("NOT_PARTICIPANT"); System.exit(3); }
        catch (Exception error) { System.err.println("UNSUPPORTED_REPLAY"); System.exit(2); }
    }
    static void run(String[] args) throws Exception {
        Metadata metadata = new Metadata();
        try (InputStream input = new FileInputStream(args[0])) {
            new SimpleRunner(new InputStreamSource(input)).runWith(metadata);
        }
        var match = metadata.match;
        if (match == null || metadata.file == null || !metadata.file.getGameInfo().hasDota()
                || !match.hasMatchId() || match.getMatchId() <= 0
                || match.getMatchId() != metadata.file.getGameInfo().getDota().getMatchId()
                || !match.hasDuration() || match.getDuration() <= 0 || match.getDuration() > 14400
                || !match.hasStarttime() || match.getPlayersCount() < 1 || match.getPlayersCount() > 10)
            throw new IOException("Incomplete metadata");
        long account = Long.parseLong(args[1]);
        if (match.getPlayersList().stream().noneMatch(p -> p.hasAccountId() && Integer.toUnsignedLong(p.getAccountId()) == account))
            throw new SecurityException();
        String outcome = match.getMatchOutcome().name();
        if (!outcome.equals("k_EMatchOutcome_RadVictory") && !outcome.equals("k_EMatchOutcome_DireVictory"))
            throw new IOException("Unfinished match");

        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        Parse parsed;
        try (InputStream input = new FileInputStream(args[0])) { parsed = new Parse(input, buffer, true); }
        if (!parsed.epilogue) throw new IOException("Missing epilogue");
        JsonObject stats = JsonParser.parseString(buffer.toString("UTF-8")).getAsJsonObject();
        Map<Integer, JsonObject> bySlot = new HashMap<>();
        for (JsonElement player : stats.getAsJsonArray("players")) {
            JsonObject row = player.getAsJsonObject();
            bySlot.put(row.get("player_slot").getAsInt(), row);
        }
        JsonObject output = new JsonObject();
        output.addProperty("match_id", match.getMatchId());
        output.addProperty("start_time", Integer.toUnsignedLong(match.getStarttime()));
        output.addProperty("duration", match.getDuration());
        output.addProperty("radiant_win", outcome.equals("k_EMatchOutcome_RadVictory"));
        put(output, "lobby_type", match.hasLobbyType() ? match.getLobbyType() : null);
        output.addProperty("game_mode", metadata.file.getGameInfo().getDota().getGameMode());
        put(output, "radiant_score", match.hasRadiantTeamScore() ? match.getRadiantTeamScore() : null);
        put(output, "dire_score", match.hasDireTeamScore() ? match.getDireTeamScore() : null);
        for (String key : List.of("version", "radiant_gold_adv", "radiant_xp_adv", "objectives", "teamfights"))
            output.add(key, stats.get(key));
        JsonArray players = new JsonArray();
        for (var player : match.getPlayersList()) {
            if (!player.hasPlayerSlot() || !player.hasHeroId()) throw new IOException("Missing player identity");
            JsonObject row = new JsonObject();
            row.addProperty("player_slot", player.getPlayerSlot());
            row.addProperty("hero_id", player.getHeroId());
            put(row, "account_id", player.hasAccountId() ? Integer.toUnsignedLong(player.getAccountId()) : null);
            String name = player.getPlayerName();
            row.addProperty("personaname", name.substring(0, Math.min(name.length(), 128)));
            put(row, "kills", player.hasKills() ? player.getKills() : null);
            put(row, "deaths", player.hasDeaths() ? player.getDeaths() : null);
            put(row, "assists", player.hasAssists() ? player.getAssists() : null);
            put(row, "gold_per_min", player.hasGoldPerMin() ? player.getGoldPerMin() : null);
            put(row, "xp_per_min", player.hasXpPerMin() ? player.getXpPerMin() : null);
            put(row, "last_hits", player.hasLastHits() ? player.getLastHits() : null);
            put(row, "denies", player.hasDenies() ? player.getDenies() : null);
            put(row, "level", player.hasLevel() ? player.getLevel() : null);
            put(row, "net_worth", player.hasNetWorth() ? player.getNetWorth() : null);
            put(row, "hero_damage", player.hasHeroDamage() ? player.getHeroDamage() : null);
            put(row, "tower_damage", player.hasTowerDamage() ? player.getTowerDamage() : null);
            put(row, "hero_healing", player.hasHeroHealing() ? player.getHeroHealing() : null);
            put(row, "item_0", player.hasItem0() ? player.getItem0() : null);
            put(row, "item_1", player.hasItem1() ? player.getItem1() : null);
            put(row, "item_2", player.hasItem2() ? player.getItem2() : null);
            put(row, "item_3", player.hasItem3() ? player.getItem3() : null);
            put(row, "item_4", player.hasItem4() ? player.getItem4() : null);
            put(row, "item_5", player.hasItem5() ? player.getItem5() : null);
            put(row, "backpack_0", player.hasItem6() ? player.getItem6() : null);
            put(row, "backpack_1", player.hasItem7() ? player.getItem7() : null);
            put(row, "backpack_2", player.hasItem8() ? player.getItem8() : null);
            put(row, "item_neutral", player.hasItem9() ? player.getItem9() : null);
            JsonObject recorded = bySlot.get(player.getPlayerSlot());
            if (recorded != null) for (String key : List.of("times", "gold_t", "xp_t", "lh_t", "purchase_log", "kills_log"))
                row.add(key, recorded.get(key));
            players.add(row);
        }
        output.add("players", players);
        System.out.print(new Gson().toJson(output));
    }
}
